const Product = require("../models/ProductModel");
const recordsPerPage = require("../config/pagination");
const imageValidate = require("../utils/imageValidate");
const pdfValidate = require("../utils/pdfValidate");
const cron = require("node-cron");
const moment = require("moment-timezone");

// 2024-01-04 备份

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
    // 如果query price存在，就pass小于等于XXX
    if (req.query.price) {
      queryCondition = true;
      // Mongodb比较查询： $lt < ； $lte <= ; $gt > ; $gte >=
      priceQueryCondition = { price: { $lte: Number(req.query.price) } };
    }

    let ratingQueryCondition = {};
    if (req.query.rating) {
      queryCondition = true;
      // $in 范围内 $nin $ne != not equal
      ratingQueryCondition = { rating: { $in: req.query.rating.split(",") } };
    }

    // 好像这个里面的所有 categoryQueryCondition 都是给 123级路由用的，现在我们用的是 query string，所以也许用不到了？
    let categoryQueryCondition = {};
    // 这个categoryName就是从productRoutes里面抄来的, 因为我们在 二级路由里面写的是 categoryName 所以这里params里面解析的就是 categoryName
    const categoryName = req.params.categoryName || "";
    //100章，从all下拉栏选择categories并search， 因为 下拉里面的格式是： PPE/XXXX 所以可以这么用， 然后可以用到所有的 PPE/XXX/XXX
    // 如果categoryName 是 true，则queryCondition 就 true （好像这里的categoryName可以带上subcategory）
    if (categoryName) {
      queryCondition = true;
      // 用, 去replace所有的/
      let a = categoryName.replace(/,/g, "/");
      // for searching，需要 regular expression(正则表达式)，可以从^PPE/XXX开始search 就比较快了
      // 新搞得一个subcategories用的，设置正则表达为null，然后再写入值
      var regEx = null;
      // 我们这里的 subCategoryName 是在frontend Productlistpagecomponent里面新设置的subcategories的变量，因为是存到了query里面，所以consolelog queryd的话，可以看到
      // 其实这里的 subCategoryName 和 childCategoryName 是从 route里面解析的，存在了params里的， 所以可以 req.query.XXX 来读取，并赋值
      var subCategoryName = req.query.subCategoryName;
      var childCategoryName = req.query.childCategoryName;
      var fourCategoryName = req.query.fourCategoryName;
      var fiveCategoryName = req.query.fiveCategoryName;
      // console.log("fffff:", childCategoryName);

      // 这里是表示如果，subCategoryName有值就返回 a +  subCategoryName ，因为a是maincategory 所以 要加上 subCategoryName 这个subcategories，来组成新的正则表达
      if (fiveCategoryName) {
        regEx = new RegExp(
          "^" +
          a +
          "/" +
          subCategoryName +
          "/" +
          childCategoryName +
          "/" +
          fourCategoryName +
          "/" +
          fiveCategoryName +
          "(?:/|$)"
        );
      } else if (fourCategoryName) {
        regEx = new RegExp(
          "^" +
          a +
          "/" +
          subCategoryName +
          "/" +
          childCategoryName +
          "/" +
          fourCategoryName +
          "(?:/|$)"
        );
      } else if (childCategoryName) {
        regEx = new RegExp(
          "^" + a + "/" + subCategoryName + "/" + childCategoryName + "(?:/|$)"
        );
      } else if (subCategoryName) {
        regEx = new RegExp("^" + a + "/" + subCategoryName + "(?:/|$)");
      } else {
        regEx = new RegExp("^" + a);
      }
      // 在这儿console.log一下， 看一下正则表达式
      // console.log("xxx:", regEx);
      categoryQueryCondition = { category: regEx };
    }

    let brandQueryCondition = {};
    const brandName = req.params.brandName || "";

    if (brandName) {
      queryCondition = true;
      // Use - to replace all ,
      let a = brandName.replace(/,/g, "-");
      // var regEx = new RegExp("^" + a); //敏感匹配
      var regEx = new RegExp(a, "i"); // 不敏感匹配
      brandQueryCondition = { supplier: regEx };
    }

    let attrsQueryCondition = [];
    if (req.query.attrs) {
      // attrs=RAM-1TB-2TB-4TB,color-blue-red
      // [ 'RAM-1TB-4TB', 'color-blue', '' ] 这里需要 turn this string into such larray
      // RAM 是key，1TB 4TB是values
      attrsQueryCondition = req.query.attrs.split(",").reduce((acc, item) => {
        if (item) {
          let a = item.split("-");
          let values = [...a];
          values.shift(); // removes first item
          let a1 = {
            // a[0] 是key，RAM or Color
            attrs: { $elemMatch: { key: a[0], value: { $in: values } } },
          };
          acc.push(a1);
          // console.dir(acc, { depth: null })
          return acc;
        } else return acc;
      }, []);
      //   console.dir(attrsQueryCondition, { depth: null });
      queryCondition = true;
    }

    //pagination
    // 如果pageNum不exist，就assign 1 to page Number
    const pageNum = Number(req.query.pageNum) || 1;
    // console.log(req.query.pageNum);

    // sort by name, price etc.
    let sort = {};
    // sortOption request query sort or empty string
    const sortOption = req.params.sortOrder || "";
    if (sortOption) {
      // 在Ftend的sortoptioncomponent里，option下拉菜单里，设置了value值：price_1等，来进行排序，所以此处调用并更改， overwrite it
      let sortOpt = sortOption.split("_");
      sort = { [sortOpt[0]]: Number(sortOpt[1]) };
    }

    /* ******* search function ******* */

    // 第九版 searchQuery
    const searchQuery = req.params.searchQuery || "";
    let searchQueryCondition = {};
    let select = {};
    
    const performSearch = async (query) => {
      console.log("Received search query:", query.searchQuery);
      const searchWords = query.searchQuery.split(" ");
      let results = new Map();
    
      let queriesToSearch = [];
      console.log("Number of words in query:", searchWords.length); 
      if (searchWords.length === 2 || searchWords.length === 3) {
        const permutations = generatePermutations(searchWords);
        queriesToSearch = permutations.map(perm => `"${perm.join(" ")}"`);
      } else {
        queriesToSearch = [`"${query.searchQuery}"`];
      }
    
      console.log("Queries to search:", queriesToSearch);
    
      for (const queryText of queriesToSearch) {
        console.log("Performing text search for:", queryText);
        const queryResults = await performTextSearch(queryText);
    
        queryResults.forEach((result) => {
          results.set(result._id.toString(), result);
        });
      }
    
      return Array.from(results.values());
    };
    
    const performTextSearch = async (searchQuery) => {
      console.log("Text search for:", searchQuery);
      const searchCondition = {
        $text: {
          $search: searchQuery,
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };
      return await Product.find(searchCondition);
    };
    
    
    const generatePermutations = (array) => {
      if (array.length === 2) {
        return [array, [array[1], array[0]]];
      } else if (array.length === 3) {
        return [
          array,
          [array[0], array[2], array[1]],
          [array[1], array[0], array[2]],
          [array[1], array[2], array[0]],
          [array[2], array[0], array[1]],
          [array[2], array[1], array[0]],
        ];
      } else {
        return [array];
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
    
      if (searchWords.length > 1) {
        const results = await performSearch({ searchQuery, productIds: [] });
        if (results && results.length > 0) {
          searchQueryCondition = { _id: { $in: results.map((p) => p._id) } };
        } else {
            let categoryMatchedProducts = [];
            const filteredSearchWords = searchWords.filter(
              (word) => word.length > 1
            );
    
            for (const word of filteredSearchWords) {
              const regex = new RegExp(`${word}`, "i");
              const categoryMatch = await Product.find({
                category: {
                  $regex: regex,
                },
              });
              categoryMatchedProducts =
                categoryMatchedProducts.concat(categoryMatch);
            }
    
            const productIds = categoryMatchedProducts.map((p) => p._id);
    
            if (categoryMatchedProducts.length > 0) {
              searchQueryCondition = await performSearch({
                searchQuery,
                productIds,
              });
    
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
      } else {
        if (searchWords.length === 1 && searchWords[0].startsWith('CTL')) {
            searchQueryCondition = {
              'stock.ctlsku': {
                $regex: new RegExp(`${searchWords[0]}`, "i"),
              },
            };
          } else {
            searchQueryCondition = await performSearch({
              searchQuery,
              productIds: [],
            });
          }
      }
    }
    
    
    

    if (queryCondition) {
      query = {
        $and: [
          priceQueryCondition,
          ratingQueryCondition,
          categoryQueryCondition,
          brandQueryCondition,
          searchQueryCondition,
          ...attrsQueryCondition,
        ],
      };
    }

    const sortCriteria = [
      ["sortOrder", 1],
      ["category", 1],
      ["supplier", 1],
      ["name", 1],
      ["material", 1],
      ["width", 1],
      ["length", 1],
      ["thickness", 1],
    ];
    // console.log("sort criteria", sortCriteria)
    const totalProducts = await Product.countDocuments(query);
    let products = await Product.find(query)
      .select(select)
      .skip(recordsPerPage * (pageNum - 1))
      .sort(sortCriteria)
      .limit(recordsPerPage);
    //  Math.ceil (x) 返回不小于x的最接近的整数
    res.json({
      products,
      pageNum,
      paginationLinksNumber: Math.ceil(totalProducts / recordsPerPage),
    });
    // console.log(pageNum);
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    // populate("reviews") 就把reviews展开了，并不仅仅显示reviews的ID
    const product = await Product.findById(req.params.id)
      /* .populate("reviews") */
      .orFail();
    res.json(product);
  } catch (err) {
    next(err);
  }
};

const adminGetProducts = async (req, res, next) => {
  // for products page
  try {
    // 设置了sort by category，然后下面括号里选择了，get哪些数据
    const products = await Product.find({})
      .sort({ ctlsku: 1 })
      .select(
        "name category displayPrice supplier stock.price stock.purchaseprice stock.ctlsku stock.count stock.suppliersku stock.slrsku stock.attrs stock.barcode"
      );
    return res.json(products);
  } catch (err) {
    next(err);
  }
};

const adminGetCTLSKU = async (req, res, next) => {
  // for products page
  try {
    // 设置了sort by category，然后下面括号里选择了，get哪些数据
    const products = await Product.find({})
      .sort({ ctlsku: 1 })
      .select(
        "stock.ctlsku"
      );
    return res.json(products);
  } catch (err) {
    next(err);
  }
};

const adminDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).orFail();
    await product.remove();
    res.json({ message: "product removed" });
  } catch (err) {
    next(err);
  }
};

const adminCreateProduct = async (req, res, next) => {
  try {
    const product = new Product();
    const {
      name,
      description,
      saleunit,
      max,
      //purchaseprice,
      displayPrice,
      supplier,
      category,
      attributesTable,
      stock,
      sortOrder,
      standards,
    } = req.body;

    // console.log(req.body);
    product.name = name;
    product.description = description;
    product.saleunit = saleunit;
    product.max = max;
    product.sortOrder = sortOrder;
    product.displayPrice = displayPrice;
    product.supplier = supplier;
    product.category = category;
    product.standards = standards || "";
    if (stock.length > 0) {
      product.stock = [];
      stock.map((item) => {
        const {
          attrs,
          count,
          price,
          purchaseprice,
          barcode,
          ctlsku,
          slrsku,
          suppliersku,
        } = item;
        product.stock.push({
          attrs: attrs || "",
          count: count || 0,
          price: price || 0,
          purchaseprice: purchaseprice || 0,
          barcode: barcode || "",
          ctlsku: ctlsku || "",
          slrsku: slrsku || "",
          suppliersku: suppliersku || "",
        });
      });
    } else {
      product.stock = [];
    }

    if (attributesTable.length > 0) {
      attributesTable.map((item) => {
        product.attrs.push(item);
      });
    }
    await product.save();

    res.json({
      message: "product created",
      productId: product._id,
    });
  } catch (err) {
    next(err);
  }
};

const schedulePriceReset = async (productId, expireDate) => {
  const [time, date] = expireDate.split(" ");
  const [hour, minute, second] = time.split(":");
  const [day, month, year] = date.split("/");

  const expireDateTimePerth = moment.tz(
    `${year}-${month}-${day} ${hour}:${minute}:${second}`,
    "Australia/Perth"
  );

  const expireDateTimeUTC = expireDateTimePerth.clone().tz("UTC");

  const cronExpression = `${expireDateTimeUTC.seconds()} ${expireDateTimeUTC.minutes()} ${expireDateTimeUTC.hours()} ${expireDateTimeUTC.date()} ${expireDateTimeUTC.month() + 1
    } *`;

  cron.schedule(cronExpression, async () => {
    const product = await Product.findById(productId);
    product.displayPrice = 0;
    await product.save();
  });
};

const dailyPriceResetCheck = async () => {
  console.log("Daily Price Reset Check");

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  const options = {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-AU", options);
  const [day, month, year] = formatter.format(now).split("/");
  const formattedDate = new Date(`${month}/${day}/${year}`);

  const products = await Product.find();

  for (const product of products) {
    if (!product.expireDate || product.expireDate === "00:00:00 00/00/00")
      continue;

    const [time, date] = product.expireDate.split(" ");
    const [expDay, expMonth, expYear] = date.split("/");
    const expireDate = new Date(`${expMonth}/${expDay}/${expYear}`);

    if (expireDate.setHours(0, 0, 0, 0) <= formattedDate.setHours(0, 0, 0, 0)) {
      if (product.displayPrice !== 0) {
        product.displayPrice = 0;
        await product.save();
      }
    }
  }
};

/* cron.schedule('0 59 07 * * *', dailyPriceResetCheck, {
  scheduled: true,
  timezone: "UTC"
}); */

cron.schedule("0 10 16 * * *", dailyPriceResetCheck, {
  scheduled: true,
  timezone: "UTC",
});

const adminUpdateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).orFail();
    const {
      name,
      description,
      supplier,
      RRP,
      category,
      images,
      pdfs,
      sortOrder,
      displayPrice,
      saleunit,
      max,
      stock,
      standards,
      expireDate,
    } = req.body;
    product.name = name || product.name;
    product.description = description || product.description;
    product.supplier = supplier || product.supplier;
    product.RRP = RRP || product.RRP;
    product.category = category || product.category;
    product.images = images || product.images;
    product.pdfs = pdfs || product.pdfs;
    product.sortOrder = sortOrder || product.sortOrder;
    product.displayPrice = displayPrice || product.displayPrice;
    product.saleunit = saleunit || product.saleunit;
    product.max = max || product.max;
    product.standards = standards || product.standards;
    // product.expireDate = expireDate || product.expireDate;
    product.expireDate =
      expireDate === "remove" ? undefined : expireDate || product.expireDate;
    if (stock.length > 0) {
      product.stock = [];
      stock.map((item) => {
        const {
          _id,
          attrs,
          count,
          price,
          purchaseprice,
          barcode,
          ctlsku,
          slrsku,
          suppliersku,
        } = item;
        product.stock.push({
          _id: _id,
          attrs: attrs || "",
          count: count || 0,
          price: price || 0,
          purchaseprice: purchaseprice || 0,
          barcode: barcode || "",
          ctlsku: ctlsku || "",
          slrsku: slrsku || "",
          suppliersku: suppliersku || "",
        });
      });
    } else {
      product.stock = [];
    }
    await product.save();

    // if (expireDate) {
    //   await schedulePriceReset(req.params.id, expireDate);
    // }

    res.json({
      message: "product updated",
    });
  } catch (err) {
    next(err);
  }
};

const getProductByCTLSKU = async (req, res, next) => {
  try {
    const { clientSKU } = req.params;
    const product = await Product.findOne({ "stock.ctlsku": clientSKU });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const stockItem = product.stock.find((item) => item.ctlsku === clientSKU);
    if (!stockItem) {
      return res.status(404).json({ error: "Stock item not found" });
    }
    res.json({ slrsku: stockItem.slrsku });
  } catch (err) {
    next(err);
  }
};

const adminUpdateSKU = async (req, res, next) => {
  try {
    const ctlsku = req.params.ctlsku;
    const slrsku = req.body.slrsku;
    //console.log(ctlsku, slrsku);

    if (!slrsku) {
      return res.status(400).json({ error: "slrsku is required" });
    }

    const product = await Product.findOneAndUpdate(
      { "stock.ctlsku": ctlsku },
      { $set: { "stock.$.slrsku": slrsku } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (err) {
    next(err);
  }
};

const adminUpdateCategory = async (req, res, next) => {
  try {

    const product = await Product.findOneAndUpdate(
      { "_id": req.params.id },
      { $set: { "category": req.body.selectedCategory } },
      { new: true });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (err) {
    next(err)
  }
};

const adminUpload = async (req, res, next) => {
  if (req.query.cloudinary === "true") {
    try {
      let product = await Product.findById(req.query.productId).orFail();
      product.images.push({ path: req.body.url });
      await product.save();
    } catch (err) {
      next(err);
    }
    return;
  }
  try {
    // 如果nothing in req.files ；  ！！非空判断
    if (!req.files || !!req.files.images === false) {
      return res.status(400).send("No files were uploaded.");
    }

    const validateResultImage = imageValidate(req.files.images);
    if (validateResultImage.error) {
      return res.status(400).send(validateResultImage.error);
    }

    const path = require("path");
    const { v4: uuidv4 } = require("uuid");
    const uploadDirectoryImage = path.resolve(
      __dirname,
      "../../frontend",
      "public",
      "images",
      "products"
    );

    let product = await Product.findById(req.query.productId).orFail();

    // iamge
    let imagesTable = [];
    if (Array.isArray(req.files.images)) {
      imagesTable = req.files.images;
    } else {
      imagesTable.push(req.files.images);
    }

    for (let image of imagesTable) {
      var fileName = uuidv4() + path.extname(image.name);
      var uploadPath = uploadDirectoryImage + "/" + fileName;
      product.images.push({ path: "/images/products/" + fileName });
      image.mv(uploadPath, function (err) {
        if (err) {
          return res.status(500).send(err);
        }
      });
    }
    await product.save();
    return res.send("Files uploaded!");
  } catch (err) {
    next(err);
  }
};

// PDFs
const adminUploadPdf = async (req, res, next) => {
  if (req.query.cloudinary === "true") {
    try {
      let product = await Product.findById(req.query.productId).orFail();
      product.pdfs.push({ path: req.body.url });
      await product.save();
    } catch (err) {
      next(err);
    }
    return;
  }
  try {
    if (!req.files || !!req.files.pdfs === false) {
      return res.status(400).send("No files were uploaded.");
    }

    const validateResultPdf = pdfValidate(req.files.pdfs);
    if (validateResultPdf.error) {
      return res.status(400).send(validateResultPdf.error);
    }

    const path = require("path");
    const { v4: uuidv4 } = require("uuid");
    const uploadDirectoryPdf = path.resolve(
      __dirname,
      "../../frontend",
      "public",
      "images",
      "documents"
    );

    let product = await Product.findById(req.query.productId).orFail();
    let pdfsTable = [];
    if (Array.isArray(req.files.pdfs)) {
      pdfsTable = req.files.pdfs;
    } else {
      pdfsTable.push(req.files.pdfs);
    }

    for (let pdf of pdfsTable) {
      // 下面这个是用uuidv4 来随机命名，然后path.extname(pdf.name)是取 .pdf ， 用来拼接成一个随机生成的字符串+.pdf构成文件名
      // 再后面的两个 pdf.name 原本应该是 fileName的，但是这里我需要让文件名直接显示，所以就换掉了
      // var fileName = uuidv4() + path.extname(pdf.name);
      var uploadPath = uploadDirectoryPdf + "/" + pdf.name;
      // console.log(pdf);
      product.pdfs.push({ path: "/images/documents/" + pdf.name });
      pdf.mv(uploadPath, function (err) {
        if (err) {
          return res.status(500).send(err);
        }
      });
    }
    await product.save();
    return res.send("Files uploaded!");
  } catch (err) {
    next(err);
  }
};

const adminDeleteProductImage = async (req, res, next) => {
  const imagePath = decodeURIComponent(req.params.imagePath);
  if (req.query.cloudinary === "true") {
    try {
      await Product.findOneAndUpdate(
        { _id: req.params.productId },
        { $pull: { images: { path: imagePath } } }
      ).orFail();
      return res.end();
    } catch (er) {
      next(er);
    }
    return;
  }
  try {
    const path = require("path");
    const finalPath = path.resolve("../frontend/public") + imagePath;

    const fs = require("fs");
    fs.unlink(finalPath, (err) => {
      if (err) {
        res.status(500).send(err);
      }
    });
    await Product.findOneAndUpdate(
      { _id: req.params.productId },
      { $pull: { images: { path: imagePath } } }
    ).orFail();
    return res.end();
  } catch (err) {
    next(err);
  }
};

const adminDeleteProductPdf = async (req, res, next) => {
  const pdfPath = decodeURIComponent(req.params.pdfPath);
  if (req.query.cloudinary === "true") {
    try {
      await Product.findOneAndUpdate(
        { _id: req.params.productId },
        { $pull: { pdfs: { path: pdfPath } } }
      ).orFail();
      return res.end();
    } catch (er) {
      next(er);
    }
    return;
  }
  try {
    const path = require("path");
    const finalPath = path.resolve("../frontend/public") + pdfPath;

    const fs = require("fs");
    fs.unlink(finalPath, (err) => {
      if (err) {
        res.status(500).send(err);
      }
    });
    await Product.findOneAndUpdate(
      { _id: req.params.productId },
      { $pull: { pdfs: { path: pdfPath } } }
    ).orFail();
    return res.end();
  } catch (err) {
    next(err);
  }
};

/* const checkStockCount = async (req, res) => {
  try {
    const products = await Product.find();
    let stockCountMissing = [];

    for (let product of products) {
      for (let stockItem of product.stock) {
        if (!stockItem.count) {
          stockCountMissing.push({ productName: product.name, ctlsku: stockItem.ctlsku, productID: product._id });
        }
      }
    }

    res.status(200).json(stockCountMissing);

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while checking stock count." });
  }
}; */

const checkStockCount = async (req, res) => {
  try {
    const productsToBeUpdated = await Product.aggregate([
      { $unwind: "$stock" },
      {
        $match: {
          "stock.count": null,
        },
      },
      {
        $project: {
          _id: 1,
          ctlsku: "$stock.ctlsku",
          productName: "$name",
        },
      },
    ]);

    const productsToUpdate = productsToBeUpdated.filter((p) => p.ctlsku);
    const productsToDelete = productsToBeUpdated.filter((p) => !p.ctlsku);

    const bulkOps = [];

    productsToDelete.forEach((p) => {
      console.log(`Product to be deleted: ${p.productName}`);
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $pull: { stock: { ctlsku: null, count: null } } },
        },
      });
    });

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }

    res.status(200).json({
      message: "The Below Stock has been removed!!!",
      details: productsToDelete,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ error: "An error occurred while checking stock count." });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductByCTLSKU,
  adminGetProducts,
  adminGetCTLSKU,
  adminDeleteProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminUpdateSKU,
  adminUpdateCategory,
  adminUpload,
  adminUploadPdf,
  adminDeleteProductImage,
  adminDeleteProductPdf,
  checkStockCount,
};
