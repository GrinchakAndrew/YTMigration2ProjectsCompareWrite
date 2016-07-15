var config = {
    transport: new(function() {
        var host = 'https://youtrack.oraclecorp.com/rest';
        this.getIssue = function(issue_id) {
            return $.ajax({
                url: host + '/issue/' + issue_id,
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.createIssue = function(data) {
            console.log(data);
            return $.ajax({
                url: host + '/issue',
                data: data,
                type: 'post',
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.updateIssue = function(issueId, data) {
            return $.ajax({
                url: host + '/issue/' + issueId,
                data: data,
                type: 'post',
                dataType: "json",
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.execCommand = function(issueId, commandData) {
            //config.transport.execCommand('MM-1010585', {"Time Blocked" : "Undefined"})
            var rawCommand = [];
            for (var key in commandData) {
                if (commandData[key].map && commandData[key].length > 1) {
                    rawCommand.push("add " + key + ' ' + commandData[key].join(" "));
                } else if (key == "Assignee") {
                    rawCommand.push(key + " " + commandData[key].join(key + " "));
                } else {
                    rawCommand.push(key + " " + commandData[key]);
                }
            }
            console.log(rawCommand, 'rawCommand');
            return $.ajax({
                url: host + '/issue/' + issueId + '/execute',
                data: {
                    command: rawCommand.join(" ")
                },
                type: 'post',
                dataType: "json",
                error: function(xhr, status, error) {
                    console.log(xhr);
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        };
        this.transportHandler = function(id, obj) {
            if (id && obj) {
                config.transport.getIssue(id).done(function(data) {
                    console.log(data)
                }).done(function() {
                    config.transport.execCommand(id, obj);
                }).done(function() {
                    config.EventsBus.eventBusDo();
                }).fail(function() {
                    console.log('Ajax has Failed!');
                });
            }
        };
    })(),
    EventsBus: new(function() {
        var eventBus;
        this.eventBusPut = function(obj) {
            eventBus = obj;
        };
        this.eventBusDo = function() {
            if (eventBus && Object.keys(eventBus).length) {
                var firstId = Object.keys(eventBus)[0];
                config.transport.transportHandler.apply(this, [firstId, eventBus[firstId]]);
                delete eventBus[firstId];
            }
        };
    })(),
    eventManager: new(function() {
        var pool = {};
        this.on = function(event, handler) {
            if (!pool[event]) {
                pool[event] = handler;
            }
        };
        this.off = function(event) {
            if (pool[event]) {
                delete pool[event];
            }
        };
        this.trigger = function(event, args) {
            if (pool[event] && typeof pool[event] === 'function') {
                return pool[event].apply(this, args);
            }
        };
    })(),
    sheetNames: [],
    fileNames: [],
    f: '',
    wb: '',
    fnArr: [function(el) {
        $(el).css('background-color') !== "rgba(0, 0, 0, 0)" ?
            $(el).css('background-color', '') :
            $(el).css('background-color', '#CCEEFF');
    }],
    defPreventer: function(e) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
        config.fnArr.forEach(function(i) {
            if (typeof i == 'function') {
                i(e.target);
            }
        });
        config.fnArr = [];
    },
    init: function(what) {
        what.forEach(function(el) {
            if ($(el).length) {
                $(el).on('dragover', config.defPreventer);
                $(el).on('dragenter', config.defPreventer);
            }
        });
    },
    rangeSeeker: function(workSheet /*Final List*/ , columnName /*Oracle Project Name*/ ) {
        var workbook = config.wb['Workbook']['Sheets'];
        var range;
        var letterRanges = [];
        var AllLetterCoordinatesKeys = config.wb.Sheets[workSheet] ? Object.keys(config.wb.Sheets[workSheet]) : 0;
        for (var i = 0; i < AllLetterCoordinatesKeys.length; i++) {
            if (AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/) && AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/)[1] === '1') {
                // if the key has value:
                if (config.wb.Sheets[workSheet][AllLetterCoordinatesKeys[i]] &&
                    config.wb.Sheets[workSheet][AllLetterCoordinatesKeys[i]]['v']) {
                    letterRanges.push(AllLetterCoordinatesKeys[i].replace(/\d+/, ''));
                }
            } else if (AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/) && AllLetterCoordinatesKeys[i].match(/^[A-Z]+(\d+)/)[1] === '2') {
                break;
            }
        }
        var ref;
        var splitRefArrOf2;
        var upperBoundNum;
        var higherBoundNum;
        var upperBoundLetter;
        var lowerBoundLetter;
        var columnNameLetter;
        workbook.forEach(function(sheet) {
            if (sheet['name'] == workSheet) {
                ref = config.wb.Sheets[sheet['name']]['!ref'];
                splitRefArrOf2 = ref.split(':');
                upperBoundNum = parseInt(config.wb.Sheets[sheet['name']]['!ref'].split(':')[0].match(/\d+/));
                lowerBoundNum = parseInt(config.wb.Sheets[sheet['name']]['!ref'].split(':')[1].match(/\d+/));
                upperBoundLetter = ref.split(':')[0].match(/\D/)[0];
                lowerBoundLetter = ref.split(':')[1].match(/\D/)[0];
                for (var i = letterRanges.length; i--;) {
                    if (config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum] &&
                        config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v']) {
                        if (config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v'] == columnName ||
                            config.wb.Sheets[sheet['name']][letterRanges[i] + upperBoundNum]['v'].includes(columnName)) {
                            range = letterRanges[i] + (upperBoundNum + 1) + ":" + letterRanges[i] + (upperBoundNum + 1);
                        }
                    }
                }
            }
        });
        return range;
    },
    getAllColumnsNamePerSheet: function() {
        if (config.sheetNames.length) {
            config.wb['Workbook']['Sheets'].forEach(function(sheet) {
                var ObjFileDroppedLast = config['fileNames'][config['fileNames'].length - 1];
                var fileNameDroppedLast = Object.keys(config['fileNames'][config['fileNames'].length - 1])[0];
                ObjFileDroppedLast[fileNameDroppedLast][sheet['name']] = [];
                var columnNamesArr = ObjFileDroppedLast[fileNameDroppedLast][sheet['name']];
                var sheetData = config.wb.Sheets[sheet['name']];
                var sheetDataKeys = Object.keys(sheetData);
                // pre-populated list of columnNames by name of the file:
                config.compareFields = {};
                sheetDataKeys.forEach(function(key) {
                    if (key.match(/\d+/) && parseInt(key.match(/\d+/)) == 1) {
                        var columnName = sheetData[key]['v'];
                        config.compareFields[columnName] = [];
                        columnNamesArr.push(columnName);
                    }
                });
                // comparing arrays of columnNames for being equally identical:
                if (config.fileNames.length == 2) {
                    var arr;
                    for (var key in config.compareFields) {
                        if (!arr) {
                            arr = JSON.stringify(config.compareFields[key]);
                        } else if (arr !== JSON.stringify(config.compareFields[key])) {
                            $.error("Columns names in both files are not the same!");
                        }
                    }
                }
            });
        } else {
            $.error("The Excel File Seems To Have No Sheets!");
        }
    },
    compareFields: {},
    getItemNamesByColumn: function(workSheet, columnName) {
        var workbook = config.wb.Workbook.Sheets;
        if (config.wb.Sheets[workSheet]) {
            var keys = Object.keys(config.wb.Sheets[workSheet]); // issues
            var upperBound = parseInt(config.wb.Sheets[workSheet]['!ref'].split(':')[1].match(/\d+/));
            var returnable = [];
            var theKey = '';
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].match(/^[A-Z]+(\d+)/) && keys[i].match(/^[A-Z]+(\d+)/)[1] === '1') {
                    var _columnName =
                        config.wb.Sheets[workSheet][keys[i]] ?
                            config.wb.Sheets[workSheet][keys[i]]['v'] : '';
                    if (_columnName == columnName) {
                        theKey = keys[i];
                        break;
                    }
                }
            }
            if (theKey) {
                theKey = theKey.replace(/[0-9]+/, '');
                while (upperBound > 1) {
                    config.wb.Sheets[workSheet][theKey + upperBound] &&
                    config.wb.Sheets[workSheet][theKey + upperBound]['v'] ?
                        returnable.push(config.wb.Sheets[workSheet][theKey + upperBound]['v']) : returnable;
                    upperBound--;
                }
            }
            return returnable.length ? returnable.reverse() : null;
        }
    },
    getLastReadFile: function() {
        return config.fileNames[config.fileNames.length - 1];
    },
    getNameOfLastReadFile: function() {
        return Object.keys(config.getLastReadFile())[0];
    },
    getMisreadingsBetweenFiles: function() {
        config['misreadings'] = {};
        // which Issues are missing, providing the first file is the one that is newer?
        var mostRecentFileIds = config.compareFields['Issue Id'][1];
        var mostObsoleteFileIds = config.compareFields['Issue Id'][0];
        config['missingIssuesById'] = [];
        for (var j = mostObsoleteFileIds.length; j--;) {
            if (!~mostObsoleteFileIds.indexOf(mostRecentFileIds[j])) {
                config['missingIssuesById'].push(mostRecentFileIds[j]);
            }
        }
        if (config['missingIssuesById'].length) {
            var outputStr = 'The following issues are missing: ' + JSON.stringify(config['missingIssuesById']);
            var $results = $('#results');
            var updatedContent = $results.html() + outputStr;
            $results.html(updatedContent);
        }
        // which issues should be updated
        var mostRecentFileUpdates = config.compareFields['Updated'][1];
        var mostObsoleteFileUpdates = config.compareFields['Updated'][0];
        // iterate through the Ids of the mostObsoleteFileIds to compare
        for (var i = 0; i < mostObsoleteFileIds.length; i++) {
            var id1 = mostObsoleteFileIds[i];
            var id2;
            var indexInTheMostRecentFileIds;
            if (mostRecentFileIds.indexOf(id1) !== -1) {
                indexInTheMostRecentFileIds = mostRecentFileIds.indexOf(id1);
                id2 = config.compareFields['Issue Id'][1][indexInTheMostRecentFileIds];
                for (var column in config.compareFields) {
                    var mostRecentFileData2Compare = config.compareFields[column][1][indexInTheMostRecentFileIds];
                    var mostObsoleteFileData2Compare = config.compareFields[column][0][i];
                    var isDataDifferent = mostRecentFileData2Compare !== mostObsoleteFileData2Compare;
                    var isIssueId = column == 'Issue Id';
                    var isUpdated = column == 'Updated';
                    var isCreated = column == 'Created';
                    var isProject = column == 'Project'
                    var isNotUndefined = mostRecentFileData2Compare !== 'Undefined' && mostObsoleteFileData2Compare !== 'Undefined';

                    // check if ids match
                    if (isIssueId && isDataDifferent) {
                        $.error("Inconsistency in Ids between files: data structure error!");
                        break;
                    }
                    if (!isProject && isNotUndefined && !isUpdated && !isCreated && isDataDifferent && id1 == id2) {
                        if (!config['misreadings'][id1]) {
                            config['misreadings'][id1] = {};
                        }
                        config['misreadings'][id1][column] = mostRecentFileData2Compare;
                    }
                }
            }
        }
    },
    populateLastDroppedFileData: function() {
        var fileData = config.getLastReadFile();
        var lastDroppedFileName = config.getNameOfLastReadFile();
        for (var workSheet in fileData[lastDroppedFileName]) {
            fileData[lastDroppedFileName][workSheet].forEach(function(columnName, i) {
                var columnData = {};
                columnData[columnName] = config.getItemNamesByColumn(workSheet, columnName);
                fileData[lastDroppedFileName][workSheet].splice(i, 1, columnData);
            });
        }

    },
    /*fetches data by column from pre-populated config.fileNames by name of the workbook*/
    getDataCollectionsByColumn: function(columnName, workbookName) {
        var returnable;
        for (var i = 0; i < config.fileNames.length; i++) {
            var _workbookName = Object.keys(config.fileNames[i])[0];
            if (workbookName == _workbookName) {
                var workbookDataObj = config.fileNames[i][_workbookName];
                var workbookSheetNames = Object.keys(workbookDataObj);
                for (var j = 0; j < workbookSheetNames.length; j++) {
                    var worksheetDataArr = workbookDataObj[workbookSheetNames[j]];
                    for (var k = 0; k < worksheetDataArr.length; k++) {
                        var _columnName = Object.keys(worksheetDataArr[k])[0];
                        if (_columnName == columnName) {
                            returnable = worksheetDataArr[k][_columnName];
                            break;
                        }
                    }
                }
            }
        }
        return returnable;
    },
    readFile: function(e) {
        if (e.originalEvent.dataTransfer) {
            if (e.originalEvent.dataTransfer.files.length) {
                var files = e.originalEvent.dataTransfer.files;
                config.f = files[0];
                var reader = new FileReader(),
                    name = config.f.name,
                    isFile = false;
                for (var i = config.fileNames.length; i--;) {
                    for (var fileName in config.fileNames[i]) {
                        if (fileName == name) {
                            isFile = true;
                            break;
                        }
                    }
                }
                if (!isFile) {
                    var pair = {};
                    pair[name] = {};
                    config['fileNames'].push(pair);
                    reader.onload = function(e) {
                        var data = e.target.result;
                        config.wb = XLSX.read(data, {
                            type: 'binary'
                        });
                        if (!config.wb.SheetNames.some(function(sheet) {
                                if (~config.sheetNames.indexOf(sheet)) {
                                    return true;
                                }
                            })) {
                            config.sheetNames = config.sheetNames.concat(config.wb.SheetNames);
                        }

                        if (!config.sheetNames.length) {
                            $.error("The Excel File Seems To Have No Sheets!");
                            $('#drag-and-drop').addClass('failure');
                        }
                        config.eventManager.trigger('onFileRead');
                    };
                    reader.readAsBinaryString(config.f);
                    config.fnArr.push(function(el) {
                        $(el).css('background-color') !== "rgba(0, 0, 0, 0)" ?
                            $(el).css('background-color', '') :
                            $(el).css('background-color', '#CCEEFF');
                    });
                    config.fnArr.forEach(function(i, j) {
                        if (typeof i == 'function') {
                            i(e.target);
                        }
                    });
                } else {
                    $.error("This File is already processed!");
                }
            }
        }
    }
};

$(document).ready(function() {
    config.init(['#draganddropitemsid']);
    $('#draganddropitemsid').on('drop',
        function(e) {
            config.defPreventer(e);
            config.readFile(e);
            config.eventManager.on('readingAllComplete', function() {
                if (config.fileNames.length == 2) {
                    $('#draganddropitemsid').addClass('success');
                    //columnName, workbookName
                    var compareArrays = function(arr1, arr2) {
                        return JSON.stringify(arr1) == JSON.stringify(arr2);
                    };
                    for (var i = 0; i < config.fileNames.length; i++) {
                        var _workbookName = Object.keys(config.fileNames[i])[0];
                        for (var key in config.compareFields) {
                            config.compareFields[key].push(config.getDataCollectionsByColumn(key, _workbookName));
                        }
                    }
                    for (var column in config.compareFields) {
                        if (!compareArrays(config.compareFields[column][0], config.compareFields[column][1]) &&
                            column == 'Issue Id') {
                            config.eventManager.trigger('compare', []);
                            break;
                        }
                    }
                }
            });
            config.eventManager.on('onFileRead', function() {
                config.getAllColumnsNamePerSheet();
                config.populateLastDroppedFileData();
                config.eventManager.trigger('readingAllComplete', []);
            });
            config.eventManager.on('compare', function() {
                config.getMisreadingsBetweenFiles();
                // prepping for the first AJAX invocation:
                var firstId = Object.keys(config.misreadings)[0];
                var firstIdData = config.misreadings[firstId];
                // first AJAX invocation:
                config.eventManager.trigger('transportDo', [firstId, firstIdData]);
                delete config.misreadings[firstId];
                // putting the remaining misreadings to EventBus:
                config.EventsBus.eventBusPut(config.misreadings);
            });
            config.eventManager.on('transportDo', config.transport.transportHandler);
        }); // on drop ending line

    $( document ).ajaxError(function() {

    });
});