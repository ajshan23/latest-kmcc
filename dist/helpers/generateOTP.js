"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = void 0;
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit code
};
exports.generateOTP = generateOTP;
