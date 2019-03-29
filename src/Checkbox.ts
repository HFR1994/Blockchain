import _ from 'lodash';
import chalk from 'chalk';
import cliCursor from 'cli-cursor';
import figures from 'figures';
import { map, takeUntil }  from 'rxjs/operators';
import Base from 'inquirer/lib/prompts/base';
import observe from 'inquirer/lib/utils/events';
import Paginator from 'inquirer/lib/utils/paginator';
import * as locale from "../locale/es_ES.json";

export class Checkbox extends Base{
    [x: string]: any;

    constructor(questions, rl, answers) {
        super(questions, rl, answers);

        if (!this.opt.choices) {
            this.throwParamError('choices');
        }

        if (_.isArray(this.opt.default)) {
            this.opt.choices.forEach(function(choice) {
                if (this.opt.default.indexOf(choice.value) >= 0) {
                    choice.checked = true;
                }
            }, this);
        }

        this.pointer = 0;

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

        var events = observe(this.rl);

        var validation = this.handleSubmitEvents(
            events.line.pipe(map(this.getCurrentValue.bind(this)))
        );
        validation.success.forEach(this.onEnd.bind(this));
        validation.error.forEach(this.onError.bind(this));

        events.normalizedUpKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onUpKey.bind(this));
        events.normalizedDownKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onDownKey.bind(this));
        events.numberKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onNumberKey.bind(this));
        events.spaceKey
            .pipe(takeUntil(validation.success))
            .forEach(this.onSpaceKey.bind(this));
        events.aKey.pipe(takeUntil(validation.success)).forEach(this.onAllKey.bind(this));
        events.iKey.pipe(takeUntil(validation.success)).forEach(this.onInverseKey.bind(this));

        // Init the prompt
        cliCursor.hide();
        this.render();
        this.firstRender = false;

        return this;
    }

    /**
     * Render the prompt to screen
     * @return {CheckboxPrompt} self
     */

    render(error = null) {
        // Render question
        var message = this.getQuestion();
        var bottomContent = '';

        if (!this.spaceKeyPressed) {
            message +=
                `${locale["checkbox.select"]} ${chalk.cyan.bold('<space>')}, ${chalk.cyan.bold('<a>')} ${locale["checkbox.all"]}, ${chalk.cyan.bold('<i>')} ${locale["checkbox.invert"]}`
        }

        // Render choices or answer depending on the state
        if (this.status === 'answered') {
            message = this.getQuestion() + chalk.cyan(this.selection.join(', '));
        } else {
            var choicesStr = renderChoices(this.opt.choices, this.pointer);
            var indexPosition = this.opt.choices.indexOf(
                this.opt.choices.getChoice(this.pointer)
            );
            message +=
                '\n' + this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
        }

        if (error) {
            bottomContent = chalk.red('>> ') + error;
        }

        this.screen.render(message, bottomContent);
    }

    /**
     * When user press `enter` key
     */

    onEnd(state) {
        this.status = 'answered';

        // Rerender prompt (and clean subline error)
        this.render();

        this.screen.done();
        cliCursor.show();
        this.done(state.value);
    }

    onError(state) {
        this.render(state.isValid);
    }

    getCurrentValue() {
        var choices = this.opt.choices.filter(function(choice) {
            return Boolean(choice.checked) && !choice.disabled;
        });

        this.selection = _.map(choices, 'short');
        return _.map(choices, 'value');
    }

    onUpKey() {
        var len = this.opt.choices.realLength;
        this.pointer = this.pointer > 0 ? this.pointer - 1 : len - 1;
        this.render();
    }

    onDownKey() {
        var len = this.opt.choices.realLength;
        this.pointer = this.pointer < len - 1 ? this.pointer + 1 : 0;
        this.render();
    }

    onNumberKey(input) {
        if (input <= this.opt.choices.realLength) {
            this.pointer = input - 1;
            this.toggleChoice(this.pointer);
        }
        this.render();
    }

    onSpaceKey() {
        this.spaceKeyPressed = true;
        this.toggleChoice(this.pointer);
        this.render();
    }

    onAllKey() {
        var shouldBeChecked = Boolean(
            this.opt.choices.find(function(choice) {
                return choice.type !== 'separator' && !choice.checked;
            })
        );

        this.opt.choices.forEach(function(choice) {
            if (choice.type !== 'separator') {
                choice.checked = shouldBeChecked;
            }
        });

        this.render();
    }

    onInverseKey() {
        this.opt.choices.forEach(function(choice) {
            if (choice.type !== 'separator') {
                choice.checked = !choice.checked;
            }
        });

        this.render();
    }

    toggleChoice(index) {
        var item = this.opt.choices.getChoice(index);
        if (item !== undefined) {
            this.opt.choices.getChoice(index).checked = !item.checked;
        }
    }

}

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */

function renderChoices(choices, pointer) {
    var output = '';
    var separatorOffset = 0;

    choices.forEach(function(choice, i) {
        if (choice.type === 'separator') {
            separatorOffset++;
            output += ' ' + choice + '\n';
            return;
        }

        if (choice.disabled) {
            separatorOffset++;
            output += ' - ' + choice.name;
            output += ' (' + (_.isString(choice.disabled) ? choice.disabled : 'Disabled') + ')';
        } else {
            var line = getCheckbox(choice.checked) + ' ' + choice.name;
            if (i - separatorOffset === pointer) {
                output += chalk.cyan(figures.pointer + line);
            } else {
                output += ' ' + line;
            }
        }

        output += '\n';
    });

    return output.replace(/\n$/, '');
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getCheckbox(checked) {
    return checked ? chalk.green(figures.radioOn) : figures.radioOff;
}
