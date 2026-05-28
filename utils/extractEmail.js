function extractEmail(text) {

    const regex =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g;

    return text.match(regex);
}

module.exports = extractEmail;