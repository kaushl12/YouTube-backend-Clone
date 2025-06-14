// const asyncHandler=(fn)=> async(req,res,next)=>{
//     try {
//         await fn(req,res,next)
//     } catch (err) {
//         res.status(err.code ||500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }

// import { error } from "console";


//accepts another async function which helps to reduce use of try and catch block.
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise
    .resolve(fn(req, res, next))
    .catch((err) => next(err));
  };
};

export { asyncHandler };
