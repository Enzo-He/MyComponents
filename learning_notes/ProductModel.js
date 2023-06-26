const mongoose = require("mongoose");
/* const Review = require("./ReviewModel"); */

const imageSchema = mongoose.Schema({
  path: { type: String, required: true },
});

const pdfSchema = mongoose.Schema({
  path: { type: String, required: true },
});

// Product model仅仅for products，还需要 user 和 admin， review等等
const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    stock: [
      {
        attrs: {
          type: String,
          required: true,
        },
        count: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        barcode: {
          type: String,
          required: false,
        },
        slrsku: {
          type: String,
          required: false,
        },
        suppliersku: {
          type: String,
          required: true,
        },
        ctlsku: {
          type: String,
          required: true,
        },
        sales: {
          type: Number,
          default: 0,
        },
      },
    ],
    supplier: {
      type: String,
      required: true,
    },
    RRP: {
      type: Number,
      required: false,
    },
    category: {
      type: String,
      required: true,
    },
    images: [imageSchema],
    pdfs: [pdfSchema],
    purchaseprice: {
      type: Number,
      required: true,
    },
    slrcurrentbuyingprice: {
      type: Number,
      required: true,
    },
    saleunit: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    standards: {
      type: String,
      required: false,
    }
  },
  {
    // 自动加时间戳
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

//这里create一些新的indexes，可以让searching faster
/* 给定一个name and description。还有一个optional name
所以，当search something的时候，search engine will look in name fields and description field。
This is so called compound index.
This index will be used when we query for name and or description of the product.
This index will NOT be used when we only query description of the product. */
/* productSchema.index(
  // 会在productController里面，用$text
  // 添加之后新的search之后，要删除数据库 -> 重新写入数据 -> 重新运行backend
  { name: "text", description: "text", "stock.slrsku": "text", "stock.ctlsku": "text", supplier: "text" },
  { name: "TextIndex" }
); */

// 第二版的 searchQuery
productSchema.index(
  {
    name: "text",
    // supplier: "text",
    // description: "text",
    "stock.slrsku": "text",
    "stock.ctlsku": "text",
  },
  {
    name: "TextIndex",
    default_language: "english",
    weights: {
      name: 5,
      // description: 2,
      supplier: 1,
      "stock.slrsku": 1,
      "stock.ctlsku": 1,
    },
  }
);

/* productSchema.index({ slrsku: "text", name: "text"});
productSchema.index({ slrsku: 1 , name: 1}); */
//如果要只用description搜索，我们需要再设置一个新的index
// attrs:key 以及 attrs:value 我们在网页里有定义，1，one means a standard 从A到Z，-1 从Z到A
productSchema.index({ "attrs.key": 1, "attrs.value": 1 });
// productSchema.index({name: -1});

/* 
Compound index example:

productSchema.index({ category: 1, name: 1 });

we can use such index if one query covers two fields, for example: find products from laptops category and sort by name,

other possibilities:

find products from laptops category

find products from laptops category and name is like "Dell"

ind products from laptops category and name is like "Dell" order by name desc

The above compound index will not be used for query on "name" field alone, for example "find products where name is like Dell". So we need a separate index for this.


Single field index example:

productSchema.index({ category: 1 });
productSchema.index({ name: 1 });
If we want to find only by category or name

*/

module.exports = Product;

// this model will be used for querying products collection to fetch something from products,
// fetch products from products collection, save product to the dtabase, delete and update.
