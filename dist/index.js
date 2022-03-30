import fuzzy from 'fuzzy';
import chalk from 'chalk';
import inquirerPrompt from 'inquirer-autocomplete-prompt';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import * as R from 'ramda';
const types = JSON.parse(await readFile('./types.json'));
const maxKeySize = R.pipe(R.keys, R.map(R.length), R.apply(Math.max))(types);
console.log(maxKeySize);
const commitTypes = [];
Object.keys(types).forEach((key) => {
    const missingSpace = R.join('', R.repeat(" ", R.subtract(maxKeySize, R.length(key))));
    // @ts-ignore
    commitTypes.push(`${key}: ${missingSpace}${types[key].description}`);
});
function searchType(answers, input = '') {
    return new Promise((resolve) => {
        const results = fuzzy.filter(input, commitTypes).map((el) => el.original);
        resolve(results);
    });
}
inquirer.registerPrompt('autocomplete', inquirerPrompt);
inquirer
    .prompt([
    {
        type: 'autocomplete',
        name: 'type',
        message: 'Select the type of change you are committing:',
        pageSize: 20,
        source: searchType
    },
    // {
    //   type: 'input',
    //   multiline: true,
    //   name: 'scope',
    //   message: "Insert scope",
    // },
    {
        type: 'input',
        name: 'short_desc',
        message: "Write a short, imperative tense description of the change:\n",
        transformer(a, b) {
            return `${chalk.green("(" + a.length + ")")} ${a}`;
        },
        validate(value) {
            if (value == '')
                return 'A description is required';
            else
                return true;
        },
    },
    {
        type: 'input',
        name: 'long_desc',
        message: "Write a long description of the change:\n",
    },
    {
        type: 'input',
        name: 'breakingChanges',
        message: "Breaking changes",
    },
])
    .then((answers) => {
    const feat = answers.type.split(':')[0];
    const scope = answers.scope ? `(${answers.scope})` : "";
    const breaking = answers.breakingChanges ? `\n\nBREAKING CHANGE: ${answers.breakingChanges}` : "";
    const long = answers.long_desc == "" ? "" : `\n\n${answers.long_desc}`;
    const commitMessage = `${feat}${scope}: ${answers.short_desc}${long}${breaking}`;
    // console.log(commitMessage);
    exec(`git commit -m "${commitMessage}"`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
});
