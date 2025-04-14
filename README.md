# sem-ops-utils
A collection of utility functions and libraries for semantic operations

```shell
# after bumping the version
npm run build
npm publish
```

## Develop

```shell
npm test
# example for running a specific test:
npm test -- --grep "quiz-matching"
```

## Usage

```shell
npm install --save @foerderfunke/sem-ops-utils

import { datasetToTurtle } from "sem-ops-utils"
```
or:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>dev</title>
</head>
<body>
    <script src="./dist/bundle.js"></script>
    <script>
        SemOpsUtils.datasetToTurtle()
        // ...
    </script>
</body>
</html>
```
