/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

import type {IconName} from './Icon';

import {Button, ButtonSizes} from './Button';
import {Icon} from './Icon';
import classnames from 'classnames';
import invariant from 'assert';
import electron from 'electron';
import * as React from 'react';

const {remote} = electron;
invariant(remote != null);

// For backwards compat, we have to do some conversion here.
type ShortButtonSize = 'xs' | 'sm' | 'lg';
type ButtonSize = 'EXTRA_SMALL' | 'SMALL' | 'LARGE';

type Separator = {
  type: 'separator',
};

export type Option =
  | Separator
  | {
      type?: void,
      value: any,
      label: string,
      selectedLabel?: string,
      submenu?: void,
      icon?: IconName,
      iconset?: string,
      disabled?: boolean,
    }
  | {
      type: 'submenu',
      label: string,
      submenu: Array<Option>,
      icon?: IconName,
      iconset?: string,
      disabled?: boolean,
    };

type Props = {
  className: string,
  disabled?: boolean,

  // Normally, a dropdown is styled like a button. This prop allows you to avoid that.
  isFlat: boolean,

  value: any,
  // If provided, this will be rendered as the label if the value is null.
  // Otherwise, we'll display the first option as selected by default.
  placeholder?: string,
  // If provided, this string will always be used as the label
  label?: string,
  buttonComponent?: React.ComponentType<any>,
  options: $ReadOnlyArray<Option>,
  onChange?: (value: any) => mixed,
  size?: ShortButtonSize,
  tooltip?: atom$TooltipsAddOptions,

  // Function used to determine whether an option is selected, useful if its
  // value doesn't match the pointer to `value`. === is used by default.
  selectionComparator?: (dropdownValue: any, optionValue: any) => boolean,
};

export class Dropdown extends React.Component<Props> {
  static defaultProps = {
    className: '',
    disabled: false,
    isFlat: false,
    options: [],
    value: (null: any),
    title: '',
  };

  render(): React.Node {
    const {label: providedLabel, options, placeholder} = this.props;
    let label;
    if (providedLabel != null) {
      label = providedLabel;
    } else {
      const selectedOption = this._findSelectedOption(options);

      if (selectedOption == null) {
        if (placeholder != null) {
          label = placeholder;
        } else {
          label = this._renderSelectedLabel(options[0]);
        }
      } else {
        label = this._renderSelectedLabel(selectedOption);
      }
    }

    return (
      <DropdownButton
        className={this.props.className}
        disabled={this.props.disabled}
        isFlat={this.props.isFlat}
        buttonComponent={this.props.buttonComponent}
        onExpand={this._handleDropdownClick}
        size={this.props.size}
        tooltip={this.props.tooltip}>
        {label}
      </DropdownButton>
    );
  }

  _renderSelectedLabel(option: ?Option): ?string {
    let text = null;
    if (option == null) {
      text = '';
    } else if (typeof option.selectedLabel === 'string') {
      text = option.selectedLabel;
    } else if (typeof option.label === 'string') {
      text = option.label;
    }

    if (text == null || text === '') {
      return null;
    }
    return text;
  }

  _handleDropdownClick = (event: SyntheticMouseEvent<>): void => {
    const currentWindow = remote.getCurrentWindow();
    const menu = this._menuFromOptions(this.props.options);
    menu.popup(currentWindow, event.clientX, event.clientY);
  };

  _menuFromOptions(options: $ReadOnlyArray<Option>): remote.Menu {
    const menu = new remote.Menu();
    options.forEach(option => {
      if (option.type === 'separator') {
        menu.append(new remote.MenuItem({type: 'separator'}));
      } else if (option.type === 'submenu') {
        const submenu = ((option.submenu: any): Array<Option>);
        menu.append(
          new remote.MenuItem({
            type: 'submenu',
            label: option.label,
            enabled: option.disabled !== true,
            submenu: this._menuFromOptions(submenu),
          }),
        );
      } else {
        menu.append(
          new remote.MenuItem({
            type: 'checkbox',
            checked: this._optionIsSelected(this.props.value, option.value),
            label: option.label,
            enabled: option.disabled !== true,
            click: () => {
              if (this.props.onChange != null) {
                this.props.onChange(option.value);
              }
            },
          }),
        );
      }
    });
    return menu;
  }

  _optionIsSelected(dropdownValue: any, optionValue: any): boolean {
    return this.props.selectionComparator
      ? this.props.selectionComparator(dropdownValue, optionValue)
      : dropdownValue === optionValue;
  }

  _findSelectedOption(options: $ReadOnlyArray<Option>): ?Option {
    let result = null;
    for (const option of options) {
      if (option.type === 'separator') {
        continue;
      } else if (option.type === 'submenu') {
        const submenu = ((option.submenu: any): Array<Option>);
        result = this._findSelectedOption(submenu);
      } else if (this._optionIsSelected(this.props.value, option.value)) {
        result = option;
      }

      if (result) {
        break;
      }
    }
    return result;
  }
}

type DropdownButtonProps = {
  buttonComponent?: React.ComponentType<any>,
  children?: any,
  className: string,
  disabled?: boolean,
  isFlat?: boolean,
  size?: ShortButtonSize,
  tooltip?: atom$TooltipsAddOptions,
  onExpand?: (event: SyntheticMouseEvent<>) => void,
};

const noop = () => {};

/**
 * Just the button part. This is useful for when you want to customize the dropdown behavior (e.g.)
 * show it asynchronously.
 */
export function DropdownButton(props: DropdownButtonProps): React.Element<any> {
  const ButtonComponent = props.buttonComponent || Button;
  const className = classnames('nuclide-ui-dropdown', props.className, {
    'nuclide-ui-dropdown-flat': props.isFlat === true,
  });

  const label =
    props.children == null ? null : (
      <span className="nuclide-dropdown-label-text-wrapper">
        {props.children}
      </span>
    );

  return (
    <ButtonComponent
      tooltip={props.tooltip}
      size={getButtonSize(props.size)}
      className={className}
      disabled={props.disabled === true}
      onClick={props.onExpand || noop}>
      {label}
      <Icon icon="triangle-down" className="nuclide-ui-dropdown-icon" />
    </ButtonComponent>
  );
}

function getButtonSize(size: ?ShortButtonSize): ButtonSize {
  switch (size) {
    case 'xs':
      return 'EXTRA_SMALL';
    case 'sm':
      return 'SMALL';
    case 'lg':
      return 'LARGE';
    default:
      return 'SMALL';
  }
}

export {ButtonSizes};
