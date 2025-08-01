import Validator from "shacl-engine/Validator.js"
import { validations } from "shacl-engine/sparql.js"
import { Parser, Store, Writer } from "n3"
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite"
import rdf from "rdf-ext"
import formatsPretty from "@rdfjs/formats/pretty.js"
import jsonld from "jsonld"
import { isomorphic } from "rdf-isomorphic" // also comes as sub-dependency of @comunica/query-sparql-rdfjs-lite

rdf.formats.import(formatsPretty)
export const parser = new Parser({ factory: rdf })
export const queryEngine = new QueryEngine()

export const a = rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")

export function getRdf() {
    return rdf
}

export function getWriter(prefixes) {
    return new Writer({ prefixes: prefixes })
}

// use rdf.namespace instead to be able to use ns.rdfs.label etc. TODO
export const prefixes = {
    ff: "https://foerderfunke.org/default#",
    sh: "http://www.w3.org/ns/shacl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    schema: "http://schema.org/",
}

const prefixesArr = Object.entries(prefixes).map(
    ([prefix, iri]) => [prefix, rdf.namedNode(iri)]
)

export async function datasetToTurtle(dataset) {
    return await rdf.io.dataset.toText("text/turtle", dataset, { prefixes: prefixesArr })
}

export async function datasetToJsonLdObj(dataset, rootLevelTypes = []) {
    const nquads = await rdf.io.dataset.toText("application/n-quads", dataset)
    const expanded = await jsonld.fromRDF(nquads, { format: "application/n-quads" })
    if (rootLevelTypes.length === 0) {
        return await jsonld.compact(expanded, prefixes)
    }
    const ROOT_FRAME = {
        "@context": prefixes,
        "@type": rootLevelTypes
    }
    const framed = await jsonld.frame(expanded, ROOT_FRAME)
    return await jsonld.compact(framed, prefixes)
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

export function buildValidator(shaclStr, debug = false, details = false, trace = false) {
    const dataset = turtleToDataset(shaclStr)
    return buildValidatorFromDataset(dataset, debug, details, trace)
}

export function buildValidatorFromDataset(dataset, debug = false, details = false, trace = false) {
    return new Validator(dataset, { factory: rdf, debug: debug, details: details, trace: trace, validations })
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

export function datasetFromTurtles(turtleStrings) {
    const dataset = rdf.dataset()
    for (let str of turtleStrings) {
        const quads = parser.parse(str)
        dataset.addAll(quads)
    }
    return dataset
}

export function storeToTurtle(store) {
    const dataset = rdf.dataset(store.getQuads())
    return datasetToTurtle(dataset)
}

export function storeToJsonLdObj(store, rootLevelTypes = []) {
    const dataset = rdf.dataset(store.getQuads())
    return datasetToJsonLdObj(dataset, rootLevelTypes)
}

export function addStoreToStore(source, target) {
    target.addQuads(source.getQuads())
}

export function parseObject(obj) {
    if (obj?.termType === "NamedNode" || obj?.termType === "Literal" || obj?.termType === "BlankNode") return obj
    const xsd = suffix => rdf.namedNode(prefixes.xsd + suffix)
    if (typeof obj === "boolean") return rdf.literal(obj.toString(), xsd("boolean"))
    obj = obj.toString().trim()
    if (obj.toLowerCase() === "true") return rdf.literal("true", xsd("boolean"))
    if (obj.toLowerCase() === "false") return rdf.literal("false", xsd("boolean"))
    let expanded = expand(obj)
    if (expanded.startsWith("http://") || expanded.startsWith("https://")) return rdf.namedNode(expanded)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) return rdf.literal(obj, xsd("dateTime"))
    if (/^\d{4}-\d{2}-\d{2}/.test(obj)) return rdf.literal(obj.substring(0, 10), xsd("date"))
    let num = Number(obj)
    if (!isNaN(num)) {
        let dtype = Number.isInteger(num) ? xsd("integer") : xsd("decimal")
        return rdf.literal(obj, dtype)
    }
    return rdf.literal(obj)
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

export async function sparqlSelect(query, stores) {
    let bindingsStream = await queryEngine.queryBindings(query, { sources: stores })
    let bindings = await bindingsStream.toArray()
    let results = []
    bindings.forEach(binding => {
        const variables = Array.from(binding.keys()).map(({ value }) => value)
        let row = {}
        variables.forEach(variable => {
            row[variable] = binding.get(variable).value
        })
        results.push(row)
    })
    return results
}

export async function sparqlInsertDelete(query, store) {
    await queryEngine.queryVoid(query, { sources: [store] })
}

export async function sparqlAsk(query, stores) {
    return await queryEngine.queryBoolean(query, { sources: stores })
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

export function nnExpand(shortenedUri) {
    return rdf.namedNode(expand(shortenedUri))
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

export function formatTimestamp(timestamp, compact = false) {
    const pad = (n, i = 2) => n.toString().padStart(i, "0")
    if(compact) return `${pad(timestamp.getFullYear())}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}${pad(timestamp.getMilliseconds(), 3)}`
    return `${timestamp.getFullYear()}-${pad(timestamp.getMonth() + 1)}-${pad(timestamp.getDate())}_${pad(timestamp.getHours())}-${pad(timestamp.getMinutes())}-${pad(timestamp.getSeconds())}-${pad(timestamp.getMilliseconds(), 3)}`
}

export function formatTimestampAsLiteral(timestamp) {
    return rdf.literal(timestamp.toISOString(), rdf.namedNode("http://www.w3.org/2001/XMLSchema#dateTime"))
}
