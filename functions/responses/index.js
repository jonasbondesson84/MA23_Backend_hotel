function sendResponse(code, response) {
    return {
        statusCode: code,
        headers : {
            "Content-type":"application/json"
        },
        body: JSON.stringify(response)
    }
}

module.exports = { sendResponse };