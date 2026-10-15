import bcrypt from "bcrypt"
const SALT_ROUND = 10
export const hashPassword = (passsword: string) => {
    return bcrypt.hashSync(passsword, SALT_ROUND)
}
export const verifyPassword = (plainPassword: string, hashPassword: string) => {
    const isValid = bcrypt.compareSync(plainPassword, hashPassword);

    console.log(isValid);

    return isValid;
    // return bcrypt.compareSync(plainPassword, hashPassword)
}