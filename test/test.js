import { describe, it } from "mocha"
import { deepStrictEqual } from "node:assert"
import { datasetToTurtle, datasetToTurtleWriter, parseObject } from "../src/main.js"
import rdf from "rdf-ext"

const xsd = suffix => rdf.namedNode("http://www.w3.org/2001/XMLSchema#" + suffix)

describe("all tests", function () {
    it("test parseObject()", function () {
        const nn  = rdf.namedNode("https://example.org/foo")
        const lit = rdf.literal("foo")
        deepStrictEqual(parseObject(nn), nn)
        deepStrictEqual(parseObject(lit), lit)
        deepStrictEqual(parseObject(nn), nn)
        deepStrictEqual(parseObject(true),  rdf.literal("true",  xsd("boolean")))
        deepStrictEqual(parseObject(false), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("true"),  rdf.literal("true",  xsd("boolean")))
        deepStrictEqual(parseObject("false"), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("False"), rdf.literal("false", xsd("boolean")))
        deepStrictEqual(parseObject("ff:Test"), rdf.namedNode("https://foerderfunke.org/default#" + "Test"))
        deepStrictEqual(parseObject("https://example.org/dev"), rdf.namedNode("https://example.org/dev"))
        deepStrictEqual(parseObject("2025-07-27T14:30:00"), rdf.literal("2025-07-27T14:30:00", xsd("dateTime")))
        deepStrictEqual(parseObject("2025-07-27"), rdf.literal("2025-07-27", xsd("date")))
        deepStrictEqual(parseObject("7"), rdf.literal("7", xsd("integer")))
        deepStrictEqual(parseObject("-5"), rdf.literal("-5", xsd("integer")))
        deepStrictEqual(parseObject("3.14"), rdf.literal("3.14", xsd("decimal")))
        deepStrictEqual(parseObject(" hello "), rdf.literal("hello"))
    })

    it("test dataset to turtle", async function () {
        const dataset = rdf.dataset()
        // optionally encodeURI, but the stream writer recognizes these and wraps them in <>
        dataset.add(rdf.quad(rdf.namedNode("http://example.org/s"), rdf.namedNode(encodeURI("http://example.org/aeiou.äDot.")), rdf.namedNode("http://example.org/o")))
        const prefixes = { ex: "http://example.org/" }
        const turtle = await datasetToTurtle(dataset, prefixes)
        console.log(turtle)
        const turtleWriter = await datasetToTurtleWriter(dataset, prefixes)
        console.log(turtleWriter)
    })
})
