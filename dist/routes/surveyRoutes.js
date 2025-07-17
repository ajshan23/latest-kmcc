"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const surveyController_1 = require("../controllers/surveyController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
// Survey routes
router
    .route("/")
    .post(surveyController_1.createSurvey) // Create a new survey
    .get(surveyController_1.getSurveys); // Get all surveys
// Delete a survey
router.route("/:surveyId").delete(surveyController_1.deleteSurvey);
// Question routes
router.route("/question").post(adminController_1.upload.single("image"), surveyController_1.addQuestions); // Add questions to a survey
router.route("/answers/:surveyId").get(surveyController_1.getSurveyAnswers);
router.delete("/question/:questionId", surveyController_1.deleteQuestion);
router
    .route("/question/:questionId")
    .get(surveyController_1.getQuestionById) // Get question by ID
    .put(adminController_1.upload.single("image"), surveyController_1.updateQuestion);
router.get("/surveys/:surveyId/questions", surveyController_1.getSurveyQuestions);
// Get pending survey for a user admin
router.route("/pending/user/:userId").get(surveyController_1.getPendingSurveyForAdmin);
// Get pending survey for a user
router.route("/pending").get(authMiddleware_1.authenticateUser, surveyController_1.getPendingSurvey);
router.get("/export/:surveyId", surveyController_1.exportSurveyAnswers);
// Get pending question for a user in a survey
router
    .route("/pending/survey/:surveyId")
    .get(authMiddleware_1.authenticateUser, surveyController_1.getPendingQuestion);
// Submit an answer
router.route("/submit").post(authMiddleware_1.authenticateUser, surveyController_1.submitAnswer);
//order re
router.route("/surveys/:surveyId/reorder-questions").post(surveyController_1.reorderQuestions);
router.route("/:surveyId/progress").get(authMiddleware_1.authenticateUser, surveyController_1.getSurveyProgress);
exports.default = router;
