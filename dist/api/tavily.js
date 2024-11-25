"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tavilySearch = void 0;
const core_1 = require("@tavily/core");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Step 1. Instantiating your Tavily client
const tvly = (0, core_1.tavily)({ apiKey: process.env.TAVILY_API_KEY });
function tavilySearch(tavilyQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Searching using Tavily.... Query:', tavilyQuery);
        try {
            const response = yield tvly.searchContext(tavilyQuery, {});
            return response;
        }
        catch (error) {
            console.error('Error executing search context:', error);
            throw error;
        }
    });
}
exports.tavilySearch = tavilySearch;
// Test the function
// tavilySearch('What is the capital of France?');
