import { validations } from "shacl-engine/sparql.js"
import { getRdf, turtleToDataset } from "./core.js"
import Validator from "shacl-engine/Validator.js"

export function buildValidator(shaclStr, debug = false, details = false, trace = false) {
    const dataset = turtleToDataset(shaclStr)
    return buildValidatorFromDataset(dataset, debug, details, trace)
}

export function buildValidatorFromDataset(dataset, debug = false, details = false, trace = false) {
    return new Validator(dataset, { factory: getRdf(), debug: debug, details: details, trace: trace, validations })
}
