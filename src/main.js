import Validator from "shacl-engine/Validator.js"
import { validations } from "shacl-engine/sparql.js"
import { Parser, Store } from "n3"
import rdf from "rdf-ext"
import formatsPretty from "@rdfjs/formats/pretty.js"

const parser = new Parser({ factory: rdf })
rdf.formats.import(formatsPretty)

export const prefixes = {
    ff: "https://foerderfunke.org/default#",
    sh: "http://www.w3.org/ns/shacl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
}

const prefixesArr = Object.entries(prefixes).map(
    ([prefix, iri]) => [prefix, rdf.namedNode(iri)]
)

export async function datasetToTurtle(dataset) {
    return await rdf.io.dataset.toText("text/turtle", dataset, { prefixes: prefixesArr })
}

export function turtleToDataset(turtle) {
    return rdf.dataset(parser.parse(turtle))
}

export function buildValidator(shaclStr) {
    const dataset = rdf.dataset(parser.parse(shaclStr))
    return new Validator(dataset, { factory: rdf, validations })
}

export function storeFromTurtles(turtleStrings) {
    const store = new Store({ factory: rdf })
    for (let str of turtleStrings) store.addQuads(parser.parse(str))
    return store
}

export function extractFirstIndividualUriFromTurtle(turtle, classUri) {
    const regex = new RegExp(`(.*?)\\s+a\\s+${classUri}`)
    const match = turtle.match(regex)
    if (match) return expandShortenedUri(match[1].trim())
    console.error(`Could not extract individual URI of class ${classUri} from turtle string via regex`)
    return ""
}

export function expandShortenedUri(str) {
    for (let prefix of Object.keys(prefixes)) {
        if (str.startsWith(prefix + ":")) {
            return prefixes[prefix] + str.slice(prefix.length + 1)
        }
    }
    return str
}
