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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGlobalNotification = void 0;
const firebase_1 = require("../config/firebase");
const sendGlobalNotification = (_a) => __awaiter(void 0, [_a], void 0, function* ({ title, body, data = {}, }) {
    const message = {
        notification: {
            title,
            body,
        },
        data,
        topic: "global",
    };
    try {
        const response = yield firebase_1.admin.messaging().send(message);
        console.log("Notification sent:", response);
    }
    catch (err) {
        console.error("Notification error:", err);
    }
});
exports.sendGlobalNotification = sendGlobalNotification;
