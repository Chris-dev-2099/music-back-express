const getAllWorkouts = (req, res) => {
  res.send('lista de workouts');
};

const getRegisterForm = (req, res) => {
  res.send('formulario de registro');
};

const getLoginForm = (req, res) => {
  res.send('formulario de login');
};

const registerUser = (req, res) => {
  res.send('registrando usuario...');
};

const loginUser = (req, res) => {
  res.send('iniciando sesión...');
};

const getWorkoutById = (req, res) => {
  res.send(`workout con id: ${req.params.id}`);
};

const deleteWorkoutById = (req, res) => {
  res.send(`eliminando workout con id: ${req.params.id}`);
}

module.exports = {
  getAllWorkouts,
  getRegisterForm,
  getLoginForm,
  registerUser,
  loginUser,
  getWorkoutById,
  deleteWorkoutById
};  