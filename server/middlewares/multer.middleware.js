import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + uniqueSuffix + ext);
  },
});

const uploads = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const upload = uploads.array("images", 5);
