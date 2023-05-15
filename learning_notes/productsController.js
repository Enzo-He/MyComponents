const getCombinations = (array, length) => {
  let result = [];
  const f = (active, rest, length) => {
    if (!active.length && !rest.length) return;
    if (active.length === length) {
      result.push(active);
    } else {
      if (rest.length) {
        f(active.concat(rest[0]), rest.slice(1), length);
        f(active, rest.slice(1), length);
      }
    }
  };
  f([], array, length);
  return result;
};

const getProducts = async (req, res, next) => {
  try {
    let query = {};
    let queryCondition = false;
    let priceQueryCondition = {};
    /* my price part */

    let ratingQueryCondition = {};
    /* my rating part */

    let categoryQueryCondition = {};
    const categoryName = req.params.categoryName || "";
    /* my category part */

    let attrsQueryCondition = [];
    /* my attrs part */

    const pageNum = Number(req.query.pageNum) || 1;

    let sort = {};
    const sortOption = req.query.sort || "";
    /* my sort part */

    /* ******* search function ******* */
    // 第七版 searchQuery
    const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);

    const performSearch = async (query) => {
      const searchWords = query.searchQuery.split(" ");

      if (searchWords.length <= 1) {
        return {
          $text: {
            $search: query.searchQuery,
            $caseSensitive: false,
            $diacriticSensitive: false,
          },
        };
      } else {
        const searchPattern =
          searchWords.map((word) => `(?=.*${word})`).join("") + ".*";
        const searchQueryCondition = {
          name: {
            $regex: searchPattern,
            $options: "i",
          },
        };

        const tempProducts =
          query.productIds.length > 0
            ? await Product.find({
                _id: { $in: query.productIds },
                ...searchQueryCondition,
              })
            : await Product.find(searchQueryCondition);
        if (tempProducts.length > 0) {
          return searchQueryCondition;
        } else {
          return null;
        }
      }
    };

    const performIndividualSearches = async (searchWords, productIds) => {
      const searchConditions = searchWords.map((word) => ({
        name: {
          $regex: word,
          $options: "i",
        },
      }));

      const query =
        productIds.length > 0
          ? { _id: { $in: productIds }, $or: searchConditions }
          : { $or: searchConditions };

      const products = await Product.find(query);
      return products;
    };

    if (searchQuery) {
      queryCondition = true;
      const searchWords = searchQuery.split(" ");

      let categoryMatchedProducts = [];
      const filteredSearchWords = searchWords.filter((word) => word.length > 1);

      for (const word of filteredSearchWords) {
        const regex = new RegExp(`${word}s?`, "i");
        const categoryMatch = await Product.find({
          category: {
            $regex: regex,
          },
        });
        categoryMatchedProducts = categoryMatchedProducts.concat(categoryMatch);
        console.log("categoryMatch是啥？", categoryMatchedProducts.length);
      }

      const productIds = categoryMatchedProducts.map((p) => p._id);

      if (categoryMatchedProducts.length > 0) {
        searchQueryCondition = await performSearch({ searchQuery, productIds });

        if (searchQueryCondition === null) {
          const products = await performIndividualSearches(
            filteredSearchWords,
            productIds
          );
          searchQueryCondition = { _id: { $in: products.map((p) => p._id) } };
        } else {
          searchQueryCondition = {
            _id: { $in: productIds },
            ...searchQueryCondition,
          };
        }
      } else {
        searchQueryCondition = await performSearch({
          searchQuery,
          productIds: [],
        });

        if (searchQueryCondition === null) {
          const products = await performIndividualSearches(
            filteredSearchWords,
            []
          );
          searchQueryCondition = { _id: { $in: products.map((p) => p._id) } };
        }
      }
    }

    if (queryCondition) {
      query = {
        $and: [
          priceQueryCondition,
          ratingQueryCondition,
          categoryQueryCondition,
          searchQueryCondition,
          ...attrsQueryCondition,
        ],
      };
    }
    const sortCriteria = [
      ["category", 1],
      ["slrcurrentbuyingprice", 1],
      ["name", 1],
    ];
    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select(select)
      .skip(recordsPerPage * (pageNum - 1))
      .sort(sortCriteria)
      .limit(recordsPerPage);
    res.json({
      products,
      pageNum,
      paginationLinksNumber: Math.ceil(totalProducts / recordsPerPage),
    });
    console.log(pageNum);
  } catch (error) {
    next(error);
  }
};

/* ******* search function ******* */
// 不知道是第几版？
const searchQuery = req.params.searchQuery || "";
let select = {};
console.log("我是searchQuery", searchQuery);

const searchQueryWords = searchQuery.split(" ");
let products = [];
for (let i = searchQueryWords.length; i >= 1 && products.length === 0; i--) {
  const searchQueryCondition = {
    $and: searchQueryWords.slice(0, i).map((word) => {
      return {
        $or: [
          { name: { $regex: word, $options: "i" } },
          { description: { $regex: word, $options: "i" } },
          { "stock.slrsku": { $regex: word, $options: "i" } },
          { "stock.ctlsku": { $regex: word, $options: "i" } },
          { supplier: { $regex: word, $options: "i" } },
        ],
      };
    }),
  };
  const query = {
    $and: [
      priceQueryCondition,
      ratingQueryCondition,
      categoryQueryCondition,
      searchQueryCondition,
      ...attrsQueryCondition,
    ],
  };
  const sortCriteria = [
    ["category", 1],
    ["slrcurrentbuyingprice", 1],
    ["name", 1],
  ];
  const matchingProducts = await Product.find(query)
    .select(select)
    .sort(sortCriteria);
  products = products.concat(matchingProducts);
}
const totalProducts = products.length;
products = products.slice(
  recordsPerPage * (pageNum - 1),
  recordsPerPage * pageNum
);

/* Yes, that is a good approach to progressively search for matching products by removing one word at a time and searching for all possible combinations of the remaining words. If no results are found after searching all possible combinations with fewer words, the search can continue by removing more words until every single word has been searched. This approach is called a "progressive search" or "incremental search." */

let categoryMatchedProducts = [];
for (const word of searchWords) {
  if (word.length > 1) {
    const regex = new RegExp(`${word}s?`, "i");
    const categoryMatch = await Product.find({
      category: {
        $regex: regex,
      },
    });
    categoryMatchedProducts = categoryMatchedProducts.concat(categoryMatch);
    console.log("categoryMatch是啥？", categoryMatchedProducts);
  }
}

// 第一版 searchQuery
/* const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;

      // 新方法：在productModel里面靠下面的几行，把name和description 设了text，所以此处用$text会faster
      // searchQueryCondition = { $text: { $search: searchQuery } };
      // searchQueryCondition = { $text: { $search: searchQuery, $caseSensitive: false, $diacriticSensitive: true,},};
      
      // score代表与 检索关键字 的匹配值，并设置按照score的高低排列
      // (注掉的，都是原代码，现在没有注掉了)现在因为要查找到slrsku，所以写了如下的or并列，比较老的写法，但是无敌管用
      // searchQueryCondition = { $or: [{ name: searchQuery }, { description: searchQuery }, { slrsku: searchQuery }, {supplier: searchQuery}] }
      // select = { score: { $meta: "textScore" },};
      // sort = { score: { $meta: "textScore" } };

      // 旧方法，但好用
      // bolt machine  --- machine bolt solve
      searchQueryCondition = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { "stock.slrsku": { $regex: searchQuery, $options: "i" } },
          { "stock.ctlsku": { $regex: searchQuery, $options: "i" } },
          { supplier: { $regex: searchQuery, $options: "i" } },
          { name: { $regex: searchQuery.split(" ").reverse().join(" "), $options: "i" } },
          { description: { $regex: searchQuery.split(" ").reverse().join(" "), $options: "i" } },
          { "stock.slrsku": { $regex: searchQuery.split(" ").reverse().join(" "), $options: "i" } },
          { "stock.ctlsku": { $regex: searchQuery.split(" ").reverse().join(" "), $options: "i" } },
          { supplier: { $regex: searchQuery.split(" ").reverse().join(" "), $options: "i" } },
        ],
      };

      searchQueryCondition = {
        $or: [
          { name: { $regex: `\\b${searchQuery.split(' ').join('\\b|\\b')}\\b`, $options: 'i' } },
          { description: { $regex: `\\b${searchQuery.split(' ').join('\\b|\\b')}\\b`, $options: 'i' } },
          { 'stock.slrsku': { $regex: `\\b${searchQuery.split(' ').join('\\b|\\b')}\\b`, $options: 'i' } },
          { 'stock.ctlsku': { $regex: `\\b${searchQuery.split(' ').join('\\b|\\b')}\\b`, $options: 'i' } },
          { supplier: { $regex: `\\b${searchQuery.split(' ').join('\\b|\\b')}\\b`, $options: 'i' } },
          { name: { $regex: `\\b${searchQuery.split(' ').reverse().join('\\b|\\b')}\\b`, $options: 'i' } },
          { description: { $regex: `\\b${searchQuery.split(' ').reverse().join('\\b|\\b')}\\b`, $options: 'i' } },
          { 'stock.slrsku': { $regex: `\\b${searchQuery.split(' ').reverse().join('\\b|\\b')}\\b`, $options: 'i' } },
          { 'stock.ctlsku': { $regex: `\\b${searchQuery.split(' ').reverse().join('\\b|\\b')}\\b`, $options: 'i' } },
          { supplier: { $regex: `\\b${searchQuery.split(' ').reverse().join('\\b|\\b')}\\b`, $options: 'i' } }
        ]
      };      
    } */

// 第二版 searchQuery
/* // 在ProductModel.js里面重设了 index
   // 实现了 关键词 检索，但是必须按顺序
 const searchQuery = req.params.searchQuery ? `"${req.params.searchQuery}"` : "";

    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;
      searchQueryCondition = {
        $text: {
          $search: searchQuery,
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };           
    } */

// 第二版 升级
/*  // 实现了 关键词检索，不需要顺序
const searchQuery = req.params.searchQuery ? req.params.searchQuery : "";

    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;
      searchQueryCondition = {
        $text: {
          $search: searchQuery,
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };
      if (searchQuery.indexOf(" ") !== -1) {
        const searchWords = searchQuery.split(" ");
        searchWords.forEach((word) => {
          searchQueryCondition.$text.$search += ` "${word}"`;
        });
      }
    } */

// 第三版 searchQuery
/*  // 关键词 检索，不需要顺序
  const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;
      const searchQueryWords = searchQuery.split(" ");
      searchQueryCondition = {
        $and: searchQueryWords.map((word) => {
          return {
            $or: [
              { name: { $regex: word, $options: "i" } },
              { description: { $regex: word, $options: "i" } },
              { "stock.slrsku": { $regex: word, $options: "i" } },
              { "stock.ctlsku": { $regex: word, $options: "i" } },
              { supplier: { $regex: word, $options: "i" } },
            ],
          };
        }),
      };
    }; */

// 第四版 searchQuery
/*  // "progressive search"
  const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;
      const searchWords = searchQuery.split(" ");
      let foundProducts = false;

      for (let i = searchWords.length; i > 0 && !foundProducts; i--) {
        const searchCombinations = getCombinations(searchWords, i);

        for (const combination of searchCombinations) {
          const searchPattern = combination.join(".*");
          searchQueryCondition = {
            name: {
              $regex: searchPattern,
              $options: "i",
            },
          };

          const tempQuery = {
            $and: [
              priceQueryCondition,
              ratingQueryCondition,
              categoryQueryCondition,
              searchQueryCondition,
              ...attrsQueryCondition,
            ],
          };

          const tempProducts = await Product.find(tempQuery);
          if (tempProducts.length > 0) {
            foundProducts = true;
            query = tempQuery;
            break;
          }
        }
      }
    } */

//第五版 searchQuery
/*  // 集成 $text 1-2 与 $regex 大于3
 const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    if (searchQuery) {
      queryCondition = true;
      const searchWords = searchQuery.split(" ");

      if (searchWords.length <= 2) {
        searchQueryCondition = {
          $text: {
            $search: searchQuery,
            $caseSensitive: false,
            $diacriticSensitive: false,
          },
        };
      } else {
        let foundProducts = false;

        for (let i = searchWords.length; i > 0 && !foundProducts; i--) {
          const searchCombinations = getCombinations(searchWords, i);

          for (const combination of searchCombinations) {
            const searchPattern = combination.join(".*"); // "|" ".*"
            searchQueryCondition = {
              name: {
                $regex: searchPattern,
                $options: "i",
              },
            };

            const tempQuery = { searchQueryCondition };

            const tempProducts = await Product.find(tempQuery);
            if (tempProducts.length > 0) {
              foundProducts = true;
              query = tempQuery;
              break;
            }
          }
        }
      }
    } */

// 第六版 searchQuery
/* const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    console.log("我是searchQuery", searchQuery);
    const performSearch = async (query) => {
      const searchWords = query.searchQuery.split(" ");
      if (searchWords.length <= 1) {
        return {
          $text: {
            $search: query.searchQuery,
            $caseSensitive: false,
            $diacriticSensitive: false,
          },
        };
      } else {
        for (let i = searchWords.length; i > 0; i--) {
          const searchCombinations = getCombinations(searchWords, i);
    
          for (const combination of searchCombinations) {
            const searchPattern = combination.join(".*");
            const searchQueryCondition = {
              name: {
                $regex: searchPattern,
                $options: "i",
              },
            };
    
            const tempProducts = await Product.find({ ...query.baseQuery, ...searchQueryCondition });
            if (tempProducts.length > 0) {
              return searchQueryCondition;
            }
          }
        }
      }
      return null;
    };
    
    if (searchQuery) {
      queryCondition = true;
      const searchWords = searchQuery.split(" ");
    
      let categoryMatchedProducts = [];
      for (const word of searchWords) {
        if (word.length > 1) {
          const categoryMatch = await Product.find({
            category: {
              $regex: word,
              $options: "i",
            },
          });
          categoryMatchedProducts = categoryMatchedProducts.concat(categoryMatch);
        }
        }
    
      if (categoryMatchedProducts.length > 0) {
        searchQueryCondition = await performSearch({ baseQuery: { _id: { $in: categoryMatchedProducts.map(p => p._id) } }, searchQuery });
      } else {
        searchQueryCondition = await performSearch({ baseQuery: {}, searchQuery });
      }
    } */
