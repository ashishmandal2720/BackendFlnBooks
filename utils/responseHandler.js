const responseHandler = (res, statusCode, message, data = null, error = null,count = null,) => {
    const success = statusCode >= 200 && statusCode < 300;
    res.status(statusCode).json({
        success: success,
        message,
        count:success ? count : null,
        data: success ? data : null,
        error: success ? null : error
    });
};

module.exports = responseHandler;