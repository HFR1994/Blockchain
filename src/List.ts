import _ from 'lodash';
import chalk from 'chalk';
import cliCursor from 'cli-cursor';
import figures from 'figures';
import runAsync from 'run-async';
import { flatMap, map, take, takeUntil }  from 'rxjs/operators';
import Base from 'inquirer/lib/prompts/base';
import observe from 'inquirer/lib/utils/events';
import Paginator from 'inquirer/lib/utils/paginator';
import * as locale from "../locale/es_ES.json";

export class List extends Base{
    [x: string]: any;

    constructor(questions, rl, answers) {
        super(questions, rl, answers);

        if (!this.opt.choices) {
            this.throwParamError('choices');
        }

        this.firstRender = true;
        this.selected = 0;

        let def = this.opt.default;

        // If def is a Number, then use as index. Otherwise, check for value.
        if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
            this.selected = def;
        } else if (!_.isNumber(def) && def != null) {
            let index = _.findIndex(this.opt.choices.realChoices, ({ value }) => value === def);
            this.selected = Math.max(index, 0);
        }

        // Make sure no default is set (so it won't be printed)
        this.opt.default = null;

        this.paginator = new Paginator(this.screen);
    }

    /**
     * Start the Inquiry session
     * @param  {Function} cb      Callback when prompt is done
     * @return {this}
     */

    _run(cb) {
        this.done = cb;

        let self = this;

        let events = observe(this.rl);
        events.normalizedUpKey.pipe(takeUntil(events.line)).forEach(this.onUpKey.bind(this));
        events.normalizedDownKey
            .pipe(takeUntil(events.line))
            .forEach(this.onDownKey.bind(this));
        events.numberKey.pipe(takeUntil(events.line)).forEach(this.onNumberKey.bind(this));
        events.line
            .pipe(
                take(1),
                map(this.getCurrentValue.bind(this)),
                flatMap(value => runAsync(self.opt.filter)(value).catch(err => err))
            )
            .forEach(this.onSubmit.bind(this));

        // Init the prompt
        cliCursor.hide();
        this.render();

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {ListPrompt} self
     */

    render() {
        // Render question
        let message = this.getQuestion();

        if (this.firstRender) {
            message += chalk.dim('(Use arrow keys)');
        }

        // Render choices or answer depending on the state
        if (this.status === 'answered') {
            message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
        } else {
            let choicesStr = listRender(this.opt.choices, this.selected);
            let indexPosition = this.opt.choices.indexOf(
                this.opt.choices.getChoice(this.selected)
            );
            message +=
                '\n' + this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
        }

        this.firstRender = false;

        this.screen.render(message);
    }

    /**
     * When user press `enter` key
     */

    onSubmit(value) {
        this.status = 'answered';

        // Rerender prompt
        this.render();

        this.screen.done();
        cliCursor.show();
        this.done(value);
    }

    getCurrentValue() {
        return this.opt.choices.getChoice(this.selected).key;
    }

    /**
     * When user press a key
     */
    onUpKey() {
        let len = this.opt.choices.realLength;
        this.selected = this.selected > 0 ? this.selected - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        let len = this.opt.choices.realLength;
        this.selected = this.selected < len - 1 ? this.selected + 1 : 0;
        this.render();
    }

    onNumberKey(input) {
        if (input <= this.opt.choices.realLength) {
            this.selected = input - 1;
        }
        this.render();
    }
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getCheckbox(checked) {
    return checked ? chalk.green(figures.radioOn) : figures.radioOff;
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices, pointer) {
    var output = '';
    var separatorOffset = 0;

    choices.forEach((choice, i) => {
        if (choice.type === 'separator') {
            separatorOffset++;
            output += '  ' + choice + '\n';
            return;
        }

        if (choice.disabled) {
            separatorOffset++;
            output += '  - ' + choice.name;
            output += ' (' + (_.isString(choice.value) ? chalk.red(choice.value) : chalk.red(locale["list.disabled"])) + ')';
            output += '\n';
            return;
        }

        var isSelected = i - separatorOffset === pointer;
        var line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
        if (isSelected) {
            line = chalk.cyan(line);
        }
        output += line + ' \n';
    });

    return output.replace(/\n$/, '');
}
