import joi from "joi";

// const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;

const validAccountInfo = joi.object({
  username: joi.string().min(3).max(20),
  password: joi.string(),
//   .pattern(passwordRegex).required(),
  email: joi.string().email()
});



export { validAccountInfo };