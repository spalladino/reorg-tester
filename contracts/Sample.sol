// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Sample {
  string public value;
  event Log(string value);

  function setValue(string calldata _value) external {
    emit Log(_value);
    value = _value;
  }
}