const express = require("express");
const { uploadCover, uploadContent } = require("../../controllers/admin/bookController");
const path = require("path");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const { authenticate, checkRole } = require("../../middlewares/authMiddleware");

// Max size for images: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        if (file.mimetype.startsWith("image/")) {
            uploadPath = "uploads/images/";
        } else if (file.mimetype === "application/pdf") {
            uploadPath = "uploads/pdfs/";
        } else {
            return cb(new Error("Invalid file type"), null);
        }
        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});


const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // if (file.mimetype.startsWith("image/")) {
        //     req._isImage = true; // tag image file
        // }
        cb(null, true);
    }
});

// Middleware to check image size manually
const imageSizeValidator = (req, res, next) => {
    if (req.file && req.file.size > MAX_IMAGE_SIZE) {
        // Delete the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
            success: false,
            message: "Size must be less than 10 mb",
        });
    }
    next();
};

// Routes
router.post(
    "/upload-cover/:book_id/front",
    upload.single("file"),
    authenticate,
    checkRole(["Admin"]),
    imageSizeValidator,
    (req, res) => {
        req.params.type = "front";
        uploadCover(req, res);
    }
);

router.post(
    "/upload-cover/:book_id/back",
    upload.single("file"),
    authenticate,
    checkRole(["Admin"]),
    imageSizeValidator,
    (req, res) => {
        req.params.type = "back";
        uploadCover(req, res);
    }
);

router.post(
    "/upload-content/:book_id",
    upload.single("file"),
    authenticate,
    checkRole(["Admin"]),
    uploadContent // No size check for PDFs
);

module.exports = router;