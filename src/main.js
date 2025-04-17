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

export const a = rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")

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

export async function turtleToJsonLdObj(turtle) {
    return datasetToJsonLdObj(turtleToDataset(turtle))
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

export function datasetFromStore(store) {
    return rdf.dataset(store.getQuads())
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

export function storeToJsonLdObj(store) {
    const dataset = rdf.dataset(store.getQuads())
    return datasetToJsonLdObj(dataset)
}

function parseObject(obj) {
    if (obj.constructor.name === "NamedNode" || obj.constructor.name === "Literal" ) return obj
    if (obj.toString().toLowerCase() === "true") return rdf.literal(true, rdf.namedNode(prefixes.xsd + "boolean"))
    if (obj.toString().toLowerCase() === "false") return rdf.literal(false, rdf.namedNode(prefixes.xsd + "boolean"))
    if (obj.constructor.name === "String" && (obj.startsWith("http://") || obj.startsWith("https://"))) return rdf.namedNode(obj)
    if (isNaN(obj)) return rdf.literal(obj)
    const value = Number(obj)
    if (Number.isInteger(value)) return rdf.literal(String(value), rdf.namedNode(prefixes.xsd + "integer"))
    return rdf.literal(String(value), rdf.namedNode(prefixes.xsd + "decimal"))
}

export function addTriple(store, sub, pred, obj) {
    store.addQuad(rdf.namedNode(sub), rdf.namedNode(pred), parseObject(obj))
}

export async function sparqlConstruct(query, sourceStores, targetStore) {
    const quadStream = await queryEngine.queryQuads(query, { sources: sourceStores })
    let constructedQuads = []
    return new Promise((resolve, reject) => {
        quadStream.on("data", (quad) => {
            if (targetStore) targetStore.addQuad(quad)
            constructedQuads.push(quad)
        })
        quadStream.on("end", () => resolve(constructedQuads))
        quadStream.on("error", (err) => reject(err))
    })
}

export async function sparqlSelect(query, store) {
    let bindingsStream = await queryEngine.queryBindings(query, { sources: [ store ] })
    let rows = []
    return new Promise((resolve, reject) => {
        bindingsStream.on("data", (binding) => {
            let row = {}
            for (const [ key, value ] of binding) {
                row[key.value] = value.value
                rows.push(row)
            }
        })
        bindingsStream.on("end", () => resolve(rows))
        bindingsStream.on("error", (err) => reject(err))
    })
}

export async function sparqlInsertDelete(query, store) {
    await queryEngine.queryVoid(query, { sources: [store] })
}

export function isomorphicTurtles(turtle1, turtle2) {
    return isomorphic(turtleToDataset(turtle1), turtleToDataset(turtle2))
}

export function extractFirstIndividualUriFromTurtle(turtle, classUri) {
    const regex = new RegExp(`(.*?)\\s+a\\s+${classUri}`)
    const match = turtle.match(regex)
    if (match) return expand(match[1].trim())
    console.error(`Could not extract individual URI of class ${classUri} from turtle string via regex`)
    return ""
}

export function expand(shortenedUri) {
    for (let prefix of Object.keys(prefixes)) {
        if (shortenedUri.startsWith(prefix + ":")) {
            return prefixes[prefix] + shortenedUri.slice(prefix.length + 1)
        }
    }
    return shortenedUri
}

export function shrink(fullUri) {
    for (let [ prefix, uri ] of Object.entries(prefixes)) {
        if (fullUri.startsWith(uri)) {
            return prefix + ":" + fullUri.slice(uri.length)
        }
    }
    return fullUri
}

export function quadToTriple(quad) {
    return { s: quad.subject.value, p: quad.predicate.value, o: quad.object.value }
}

export function getTimestamp(compact = false) {
    const now = new Date()
    const pad = n => n.toString().padStart(2, "0")
    if(compact) return `${pad(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

export function getTimestampAsLiteral() {
    const now = new Date().toISOString()
    return rdf.literal(now, rdf.namedNode("http://www.w3.org/2001/XMLSchema#dateTime"))
}
