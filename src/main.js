import Validator from "shacl-engine/Validator.js"
import { validations } from "shacl-engine/sparql.js"
import { Parser, Store } from "n3"
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite"
import rdf from "rdf-ext"
import formatsPretty from "@rdfjs/formats/pretty.js"
import jsonld from "jsonld"
import { isomorphic } from "rdf-isomorphic" // also comes as sub-dependency of @comunica/query-sparql-rdfjs-lite

rdf.formats.import(formatsPretty)
export const parser = new Parser({ factory: rdf })
export const queryEngine = new QueryEngine()

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

export async function datasetToJsonLdObj(dataset) {
    const nquads = await rdf.io.dataset.toText("application/n-quads", dataset)
    const doc = await jsonld.fromRDF(nquads, { format: "application/n-quads" })
    return await jsonld.compact(doc, prefixes)
}

export function turtleToDataset(turtle) {
    return rdf.dataset(parser.parse(turtle))
}

export async function jsonLdObjToDataset(jsonLdObj) {
    const nquads = await jsonld.toRDF(jsonLdObj, { format: "application/n-quads" })
    return rdf.dataset(parser.parse(nquads))
}

export function buildValidator(shaclStr) {
    const dataset = turtleToDataset(shaclStr)
    return new Validator(dataset, { factory: rdf, validations })
}

export function newStore() {
    return new Store({ factory: rdf })
}

export function storeFromDataset(dataset) {
    const store = newStore()
    for (let quad of dataset) store.addQuad(quad)
    return store
}

export function addTurtleToStore(store, turtle) {
    store.addQuads(parser.parse(turtle))
}

export function storeFromTurtles(turtleStrings) {
    const store = new Store({ factory: rdf })
    for (let str of turtleStrings) store.addQuads(parser.parse(str))
    return store
}

export function storeToTurtle(store) {
    const dataset = rdf.dataset(store.getQuads())
    return datasetToTurtle(dataset)
}

export function addTripleToStore(store, sub, pred, obj) {
    let object
    if (obj.startsWith("http://") || obj.startsWith("https://")) {
        object = rdf.namedNode(obj)
    } else {
        object = rdf.literal(obj)
    }
    store.addQuad(rdf.namedNode(sub), rdf.namedNode(pred), object)
}

export async function sparqlConstruct(query, sourceStores, targetStore) {
    const quadStream = await queryEngine.queryQuads(query, { sources: sourceStores })
    let constructedQuads = []
    return new Promise((resolve, reject) => {
        quadStream.on("data", (quad) => {
            targetStore.addQuad(quad)
            constructedQuads.push(quad)
        })
        quadStream.on("end", () => resolve(constructedQuads))
        quadStream.on("error", (err) => reject(err))
    })
}

export function isomorphicTurtles(turtle1, turtle2) {
    return isomorphic(turtleToDataset(turtle1), turtleToDataset(turtle2))
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
