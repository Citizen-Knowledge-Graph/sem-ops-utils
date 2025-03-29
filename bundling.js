import {
    datasetToTurtle,
    datasetToJsonLdObj,
    turtleToDataset,
    jsonLdObjToDataset,
    buildValidator,
    newStore,
    addTurtleToStore,
    storeFromTurtles,
    extractFirstIndividualUriFromTurtle,
    expandShortenedUri
} from "./src/main.js"

window.SemOpsUtils = {
    datasetToTurtle,
    datasetToJsonLdObj,
    turtleToDataset,
    jsonLdObjToDataset,
    buildValidator,
    newStore,
    addTurtleToStore,
    storeFromTurtles,
    extractFirstIndividualUriFromTurtle,
    expandShortenedUri
}
