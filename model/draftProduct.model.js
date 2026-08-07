import mongoose from "mongoose";

const KeyValueSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const VariantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    stock: { type: Number, default: 0 },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    selling_price: { type: Number },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    images: { type: [String], default: [] },
    imagePublicIds: { type: [String], default: [] },
  },
  { _id: false }
);

const DraftProductSchema = new mongoose.Schema(
  {
    draft_id: { type: Number, required: true, unique: true, index: true },
    title: String,
    name: String,
    price: { type: Number, default: 0 },
    selling_price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    sku: String,
    description: String,
    selling_price_link: String,
    catagory_id: { type: mongoose.Schema.Types.ObjectId, ref: "Catagories" },
    specifications: { type: [KeyValueSchema], default: [] },
    key_highlights: { type: [KeyValueSchema], default: [] },
    ingredients: { type: [KeyValueSchema], default: [] },
    nutritions: { type: [KeyValueSchema], default: [] },
    variants: { type: [VariantSchema], default: [] },
    product_image: { type: [String], default: [] },
    image_public_ids: { type: [String], default: [] },
    video_url: { type: String, default: "" },
    video_public_id: { type: String, default: "" },
    status: { type: String, default: "draft" },
    draft_stage: { type: String, default: "details" },
  },
  { timestamps: true, strict: false }
);

const DraftProducts = mongoose.model("DraftProducts", DraftProductSchema);
export default DraftProducts;
