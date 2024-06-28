import argv from 'minimist'

const option = argv(process.argv.slice(2))
// console.log(option);

export const isProduction = Boolean(option.production)
