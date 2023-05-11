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