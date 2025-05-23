function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var reactHookForm = require('react-hook-form');
var fetch = _interopDefault(require('isomorphic-unfetch'));
var React = require('react');
var slugify = _interopDefault(require('slugify'));
var cheerio = require('cheerio');

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var getFieldFromContext = (function (context, id, type) {
  if (context === null) {
    throw new Error('You need to wrap your form with a GoogleFormProvider');
  }

  var field = context.getField(id);

  if (field.type !== type) {
    throw new Error("Field with id " + field.id + " is not of type " + type);
  }

  return field;
});

var _excluded = ["children"];
var GoogleFormContext = React.createContext(null);
var useGoogleFormContext = function useGoogleFormContext() {
  return React.useContext(GoogleFormContext);
};
var GoogleFormProvider = function GoogleFormProvider(_ref) {
  var children = _ref.children,
      other = _objectWithoutPropertiesLoose(_ref, _excluded);

  return React.createElement(GoogleFormContext.Provider, {
    value: other
  }, children);
};

var OTHER_OPTION = '__other_option__';
var OTHER_OPTION_RESPONSE = 'other_option_response';
var buildCustomFieldId = function buildCustomFieldId(id) {
  return id + "-" + OTHER_OPTION_RESPONSE;
};
var useCustomOptionField = (function (id, type) {
  var context = useGoogleFormContext();
  var field = getFieldFromContext(context, id, type);

  var _useState = React.useState(false),
      isCustomOptionSelected = _useState[0],
      setIsCustomOptionSelected = _useState[1];

  var _useState2 = React.useState(false),
      customInputRequired = _useState2[0],
      setCustomInputRequired = _useState2[1];

  var register = function register(options) {
    return context.register(id, _extends({
      required: field.required
    }, options));
  };

  var currentValue = context.watch(id);
  React.useEffect(function () {
    if (field.type === 'RADIO') {
      var _isCustomOptionSelected = currentValue && currentValue === OTHER_OPTION;

      setCustomInputRequired(field.required && _isCustomOptionSelected);
      setIsCustomOptionSelected(_isCustomOptionSelected);
    } else {
      var _isCustomOptionSelected2 = currentValue && currentValue.length === 1 && currentValue.includes(OTHER_OPTION);

      setCustomInputRequired(field.required && _isCustomOptionSelected2);
      setIsCustomOptionSelected(_isCustomOptionSelected2);
    }
  }, [currentValue, customInputRequired]);
  var nonCustomOptions = field.options.filter(function (o) {
    return !o.custom;
  });

  var buildId = function buildId(value) {
    return id + "-" + slugify(value);
  };

  var buildOptionRegister = function buildOptionRegister(o) {
    var id = buildId(o.label);

    var registerOption = function registerOption(options) {
      return _extends({}, register(_extends({}, options)), {
        value: o.label
      });
    };

    return _extends({}, o, {
      id: id,
      registerOption: registerOption
    });
  };

  var result = {
    options: nonCustomOptions.map(buildOptionRegister)
  };
  var customOption = field.options.find(function (o) {
    return o.custom;
  });

  if (customOption) {
    var _id = buildId(OTHER_OPTION);

    var registerOption = function registerOption(options) {
      if (options === void 0) {
        options = {};
      }

      return _extends({}, register(_extends({}, options)), {
        value: OTHER_OPTION
      });
    };

    var customOptionId = buildCustomFieldId(_id);

    var registerCustomInput = function registerCustomInput(options) {
      if (options === void 0) {
        options = {};
      }

      return context.register(customOptionId, _extends({
        required: customInputRequired
      }, options));
    };

    var _error = context.formState.errors[customOptionId];
    result.customOption = _extends({}, customOption, {
      id: _id,
      registerOption: registerOption,
      registerCustomInput: registerCustomInput,
      error: _error
    });
  }

  var error = context.formState.errors[field.id];
  return _extends({}, field, result, {
    error: error,
    isCustomOptionSelected: isCustomOptionSelected
  });
});

var GOOGLE_FORMS_URL = 'https://survey.pizzahut.vn/api/google-form-proxy';
var GOOGLE_FORMS_URL_DEV = 'http://localhost:4000/api/google-form-proxy';
var formatQuestionName = function formatQuestionName(id) {
  if (id.includes(OTHER_OPTION_RESPONSE)) {
    return "entry." + id.replace("-" + OTHER_OPTION + "-" + OTHER_OPTION_RESPONSE, '') + "." + OTHER_OPTION_RESPONSE;
  }

  return "entry." + id;
};
var submitToGoogleForms = function submitToGoogleForms(form, formData, isDev) {
  try {
    var urlParams = new URLSearchParams();
    Object.keys(formData).forEach(function (key) {
      if (formData[key]) {
        if (formData[key].constructor === Array) {
          formData[key].forEach(function (answer) {
            urlParams.append(formatQuestionName(key), answer);
          });
        } else {
          urlParams.append(formatQuestionName(key), formData[key]);
        }
      }
    });
    var finalURL = isDev ? GOOGLE_FORMS_URL_DEV : GOOGLE_FORMS_URL;
    return Promise.resolve(fetch(finalURL + "/" + form.action + "/formResponse?submit=Submit&" + urlParams.toString(), {
      method: 'GET',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })).then(function (fetchedResult) {
      var wasSuccessful = fetchedResult.ok && fetchedResult.status < 300 && fetchedResult.status >= 200;
      return wasSuccessful;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

var resolveField = function resolveField(id, form) {
  var fieldIndex = form.fieldsOrder[id];

  if (fieldIndex === undefined) {
    throw new Error("Field with id " + id + " wasn't found in your form");
  }

  return form.fields[fieldIndex];
};

var useGoogleForm = function useGoogleForm(_ref) {
  var form = _ref.form;
  var methods = reactHookForm.useForm();

  methods.getField = function (id) {
    return resolveField(id, form);
  };

  methods.submitToGoogleForms = function (formData, isDev) {
    return submitToGoogleForms(form, formData, isDev);
  };

  return methods;
};

var useRadioInput = function useRadioInput(id) {
  return useCustomOptionField(id, 'RADIO');
};

var useCheckboxInput = function useCheckboxInput(id) {
  return useCustomOptionField(id, 'CHECKBOX');
};

var useTextInput = (function (id, fieldType) {
  var context = useGoogleFormContext();
  var field = getFieldFromContext(context, id, fieldType);
  var error = context.formState.errors[field.id];

  var register = function register(options) {
    return context.register(id, _extends({
      required: field.required
    }, options));
  };

  return _extends({}, field, {
    register: register,
    error: error
  });
});

var useShortAnswerInput = function useShortAnswerInput(id) {
  return useTextInput(id, 'SHORT_ANSWER');
};

var useLongAnswerInput = function useLongAnswerInput(id) {
  return useTextInput(id, 'LONG_ANSWER');
};

var useGridInput = (function (id, type) {
  var context = useGoogleFormContext();

  var _useState = React.useState(undefined),
      errors = _useState[0],
      setErrors = _useState[1];

  var field = getFieldFromContext(context, id, type);

  var buildId = function buildId(lineId, value) {
    return id + "-" + lineId + "-" + slugify(value);
  };

  React.useEffect(function () {
    var newErrors = field.lines.reduce(function (acc, l) {
      var fieldError = context.formState.errors[l.id];

      if (fieldError) {
        acc[l.id] = fieldError;
      }

      return acc;
    }, {});

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      setErrors(undefined);
    }
  }, [context.formState.errors]);

  var renderGrid = function renderGrid(render) {
    return field.lines.map(function (l) {
      var registerLine = function registerLine(options) {
        return context.register(l.id, _extends({
          required: field.required
        }, options));
      };

      var renderColumns = function renderColumns(render) {
        return field.columns.map(function (c) {
          var id = buildId(l.id, c.label);

          var registerColumn = function registerColumn(options) {
            return _extends({}, registerLine(options), {
              value: c.label
            });
          };

          return render(_extends({}, c, {
            registerColumn: registerColumn,
            id: id
          }));
        });
      };

      return render(_extends({}, l, {
        renderColumns: renderColumns
      }));
    });
  };

  return _extends({}, field, {
    renderGrid: renderGrid,
    errors: errors
  });
});

var useCheckboxGridInput = function useCheckboxGridInput(id) {
  return useGridInput(id, 'CHECKBOX_GRID');
};

var useRadioGridInput = function useRadioGridInput(id) {
  return useGridInput(id, 'RADIO_GRID');
};

var useDropdownInput = function useDropdownInput(id) {
  var context = useGoogleFormContext();
  var field = getFieldFromContext(context, id, 'DROPDOWN');

  var register = function register(options) {
    return context.register(id, _extends({
      required: field.required
    }, options));
  };

  var error = context.formState.errors[field.id];

  var buildId = function buildId(value) {
    return field.id + "-" + slugify(value);
  };

  var options = field.options.map(function (o) {
    var id = buildId(o.label);
    return _extends({}, o, {
      id: id
    });
  });
  return _extends({}, field, {
    options: options,
    register: register,
    error: error
  });
};

var useLinearInput = function useLinearInput(id) {
  var context = useGoogleFormContext();
  var field = getFieldFromContext(context, id, 'LINEAR');

  var register = function register(options) {
    return context.register(id, _extends({
      required: field.required
    }, options));
  };

  var buildId = function buildId(value) {
    return field.id + "-" + slugify(value);
  };

  var error = context.formState.errors[field.id];
  var options = field.options.map(function (o) {
    var id = buildId(o.label);

    var registerOption = function registerOption(options) {
      return _extends({}, register(options), {
        value: o.label
      });
    };

    return _extends({}, o, {
      id: id,
      registerOption: registerOption
    });
  });
  return _extends({}, field, {
    options: options,
    error: error
  });
};

// A type of promise-like that resolves synchronously and supports only one observer

const _iteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.iterator || (Symbol.iterator = Symbol("Symbol.iterator"))) : "@@iterator";

const _asyncIteratorSymbol = /*#__PURE__*/ typeof Symbol !== "undefined" ? (Symbol.asyncIterator || (Symbol.asyncIterator = Symbol("Symbol.asyncIterator"))) : "@@asyncIterator";

// Asynchronously call a function and send errors to recovery continuation
function _catch(body, recover) {
	try {
		var result = body();
	} catch(e) {
		return recover(e);
	}
	if (result && result.then) {
		return result.then(void 0, recover);
	}
	return result;
}

var toBool = function toBool(n) {
  return n === 1;
};

var toString = function toString(n) {
  return "" + n;
};

var getFormHtml = function getFormHtml(formUrl) {
  try {
    return Promise.resolve(fetch(formUrl)).then(function (response) {
      return Promise.resolve(response.text());
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

var extractFormData = function extractFormData(html) {
  var $ = cheerio.load(html);
  var fbzx = $('[name="fbzx"]').attr('value');

  if (!fbzx) {
    throw new Error("Invalid form. Couldn't find fbzx field.");
  }

  var scriptStringIdentifier = 'var FB_PUBLIC_LOAD_DATA_ =';
  var scriptHtml = $('script').filter(function (_, el) {
    return $(el).html().includes(scriptStringIdentifier);
  }).first().html();

  if (!scriptHtml) {
    throw new Error("Invalid form. Couldn't find script tag.");
  }

  scriptHtml = scriptHtml.slice(0, -1);
  scriptHtml = scriptHtml.replace(scriptStringIdentifier, '');
  var formDataRaw = JSON.parse(scriptHtml);
  return {
    formData: formDataRaw,
    fbzx: fbzx
  };
};

var parseGridMultiSelect = function parseGridMultiSelect(rawField) {
  var firstLine = rawField[4][0];
  var canSelectMultiple = firstLine[11][0];
  return canSelectMultiple;
};

var parseFieldType = function parseFieldType(rawField, fieldId) {
  var fieldTypes = ['SHORT_ANSWER', 'LONG_ANSWER', 'RADIO', 'DROPDOWN', 'CHECKBOX', 'LINEAR'];

  if (fieldId === 7) {
    if (parseGridMultiSelect(rawField) === 1) {
      return 'CHECKBOX_GRID';
    } else {
      return 'RADIO_GRID';
    }
  }

  if (fieldId === 9) {
    return 'DATE';
  }

  return fieldTypes[fieldId];
};

var parseOptions = function parseOptions(options) {
  return options.map(function (rawOption) {
    return {
      label: rawOption[0]
    };
  });
};

var parseCustomizableOptions = function parseCustomizableOptions(options) {
  return options.map(function (rawOption) {
    return {
      label: rawOption[0],
      custom: rawOption[4] === 1
    };
  });
};

var flattenArray = function flattenArray(array) {
  return array.map(function (item) {
    return {
      label: item[0]
    };
  });
};

var parseLines = function parseLines(lines) {
  return lines.map(function (rawLine) {
    var line = {};
    line.id = toString(rawLine[0]);
    line.label = rawLine[3][0];
    return line;
  });
};

var parseField = function parseField(rawField) {
  var field = {};
  field.label = rawField[1];
  field.description = rawField[2];
  var fieldId = rawField[3];
  field.type = parseFieldType(rawField, fieldId);

  switch (field.type) {
    case 'SHORT_ANSWER':
    case 'LONG_ANSWER':
      {
        var fieldInfo = rawField[4][0];
        field.id = toString(fieldInfo[0]);
        field.required = toBool(fieldInfo[2]);
        break;
      }

    case 'CHECKBOX':
    case 'RADIO':
      {
        var _fieldInfo = rawField[4][0];
        field.id = toString(_fieldInfo[0]);
        field.options = parseCustomizableOptions(_fieldInfo[1]);
        field.required = toBool(_fieldInfo[2]);
        break;
      }

    case 'DROPDOWN':
      {
        var _fieldInfo2 = rawField[4][0];
        field.id = toString(_fieldInfo2[0]);
        field.options = parseOptions(_fieldInfo2[1]);
        field.required = toBool(_fieldInfo2[2]);
        break;
      }

    case 'LINEAR':
      {
        var _fieldInfo3 = rawField[4][0];
        field.id = toString(_fieldInfo3[0]);
        var _fieldInfo3$ = _fieldInfo3[3],
            labelFirst = _fieldInfo3$[0],
            labelLast = _fieldInfo3$[1];
        field.legend = {
          labelFirst: labelFirst,
          labelLast: labelLast
        };
        field.options = flattenArray(_fieldInfo3[1]);
        field.required = toBool(_fieldInfo3[2]);
        break;
      }

    case 'CHECKBOX_GRID':
    case 'RADIO_GRID':
      {
        field.id = toString(rawField[0]);
        field.columns = flattenArray(rawField[4][0][1]);
        field.lines = parseLines(rawField[4]);
        field.required = toBool(rawField[4][0][2]);
        break;
      }

    case 'DATE':
      {
        var _fieldInfo4 = rawField[4][0];
        field.id = toString(_fieldInfo4[0]);
        field.required = toBool(rawField[4][0][2]);
        break;
      }
  }

  return field;
};

var parseFields = function parseFields(rawFields) {
  var fieldsOrder = {};
  var fields = rawFields.map(function (rawField, i) {
    var field = parseField(rawField);
    fieldsOrder["" + field.id] = i;
    return field;
  });
  return {
    fields: fields,
    fieldsOrder: fieldsOrder
  };
};

var parseFormData = function parseFormData(_ref) {
  var formData = _ref.formData,
      fbzx = _ref.fbzx;
  var googleForm = {};
  googleForm.fvv = 1;
  googleForm.pageHistory = 0;
  googleForm.fbzx = fbzx;
  googleForm.action = formData[14];
  googleForm.title = formData[1][8];
  googleForm.description = formData[1][0];

  var _parseFields = parseFields(formData[1][1]),
      fields = _parseFields.fields,
      fieldsOrder = _parseFields.fieldsOrder;

  googleForm.fields = fields;
  googleForm.fieldsOrder = fieldsOrder;
  return googleForm;
};

var googleFormsToJson = function googleFormsToJson(formUrl) {
  try {
    var _exit2 = false;

    var _temp3 = function _temp3(_result) {
      if (_exit2) return _result;
      var formData = extractFormData(html);
      return parseFormData(formData);
    };

    var html;

    var _temp4 = _catch(function () {
      return Promise.resolve(getFormHtml(formUrl)).then(function (_getFormHtml) {
        html = _getFormHtml;
      });
    }, function (err) {
      throw new Error("Failed to fetch form. " + err);
    });

    return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.GOOGLE_FORMS_URL = GOOGLE_FORMS_URL;
exports.GOOGLE_FORMS_URL_DEV = GOOGLE_FORMS_URL_DEV;
exports.GoogleFormProvider = GoogleFormProvider;
exports.formatQuestionName = formatQuestionName;
exports.googleFormsToJson = googleFormsToJson;
exports.submitToGoogleForms = submitToGoogleForms;
exports.useCheckboxGridInput = useCheckboxGridInput;
exports.useCheckboxInput = useCheckboxInput;
exports.useDropdownInput = useDropdownInput;
exports.useGoogleForm = useGoogleForm;
exports.useGoogleFormContext = useGoogleFormContext;
exports.useLinearInput = useLinearInput;
exports.useLongAnswerInput = useLongAnswerInput;
exports.useRadioGridInput = useRadioGridInput;
exports.useRadioInput = useRadioInput;
exports.useShortAnswerInput = useShortAnswerInput;
//# sourceMappingURL=index.js.map
