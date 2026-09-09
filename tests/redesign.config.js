const base = require('./playwright.config');
module.exports = {...base, webServer: undefined, use: {...base.use, baseURL:'http://127.0.0.1:8082'}};
