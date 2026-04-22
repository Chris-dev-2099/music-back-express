// workoutRoutes.js


const workoutController = require('../../controllers/workoutController');

import express from "express"
const router = express.Router()
export default router


// GET /api/v1/workouts/
router.get('/', workoutController.getAllWorkouts);
// GET /api/v1/workouts/register
router.get('/register', workoutController.getRegisterForm);
// GET /api/v1/workouts/login
router.get('/login', workoutController.getLoginForm);
// POST /api/v1/workouts/register
router.post('/register', workoutController.registerUser);
// POST /api/v1/workouts/login
router.post('/login', workoutController.loginUser);
// Parámetro dinámico SIEMPRE al final
router.get('/:id', workoutController.getWorkoutById);
// DELETE /api/v1/workouts/:id
router.delete('/:id', workoutController.deleteWorkoutById);

