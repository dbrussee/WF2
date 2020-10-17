window.app = {
    debugStatus: false,
    colors: {
        halo: "olivedrab",
        doneLine: "dodgerblue",
        notDoneLine: "saddlebrown",
        doneFill: "lightcyan",
        pillDone: "lightgreen",
        blockedFill: "snow",
        activeFill: "gold",
        dragFill: "khaki"
    },
    localStorage: {slot:1, slots:[null,null,null,null,null,null,null,null,null,null,null]},
    pendingAction: null,
    editing: false,
    mode: "work" // or "design"
}
app.debug = function(msg) {
    if (app.debugStatus) {
        console.log(msg);
    }
}
app.loadFromDroppedFile = function(event) {
    event.stopPropagation();
    event.preventDefault();
    var files = event.target.files || event.dataTransfer.files;

    // process all File objects
    var f = files[0]; // Should only be one
    if (f == undefined) {
        app.toast("Invalid item dropped", true);
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        //Output(
        //	"<p><strong>" + file.name + ":</strong></p><pre>" + 
        //	e.target.result.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
        //	"</pre>"
        //);
        if (e.target.result.substr(0,1) == "{") {
            var tbox = document.getElementById("locLoadFromClipboard");
            tbox.value = e.target.result;
            app.toast("Dropped file '" + f.name + "'");
        } else {
            app.toast("This does not appear to be a .flow file", true);
        }
    }
    reader.readAsText(f);        
}
app.blockWindowDrop = function(event) {
    event.stopPropagation();
	event.preventDefault();
}
app.downloadFile = function() {
    var json = JSON.stringify(WF.flow);
    var blob = new Blob([json], {type: 'text/plain'});
    if (app.URLLink != null) {
        window.URL.revokeObjectURL(app.URLLink);
        delete app.URLLink;
    }

    // Get rid of any prior link
    var a = document.getElementById("TEMPORARY_WF_FILE_DOWNLOAD_LINK");
    if (a != null) {
        document.body.removeChild(a);
    }

    app.URLLink = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.id = "TEMPORARY_WF_FILE_DOWNLOAD_LINK";
    a.style.display = "none"; // Hide it
    a.setAttribute("download", WF.flow.title + ".flow"); // Set default file name
    a.href = app.URLLink;

    document.body.appendChild(a);
    a.click();

}
app.resetFlow = function() {
    var needToEdit = false;
    if (WF.pickedItem != null) needToEdit = WF.pickedItem.completed;
    WF.pushTransaction();
    for (var key in WF.flow.items) {
        var itm = WF.flow.items[key];
        itm.doneCode = null;
        itm.completed = false;
    }
    WF.popTransaction();
    if (needToEdit) app.editItem();
}
app.toggleMode = function(mode) {
    if (mode == undefined) {
        if (app.mode == "work") {
            app.mode = "design";
        } else {
            app.mode = "work";
        }
    } else {
        app.mode = mode;
    }
    //document.getElementById("topForm").style.backgroundColor = (app.mode == "work" ? "gainsboro" : "transparent");
    document.getElementById("locModeName").innerHTML = app.mode;
    if (WF.pickedItem == null) {
        app.cancelAction(true);
    } else {
        app.cancelAction(false);
        app.editItem();
    }
}
app.toast = function(msg, isError) {
    if (isError == undefined) isError = false;
    if (msg == undefined) msg = "";
    var loc = document.getElementById("locToastMessage");
    loc.style.color = (isError ? "red" : "brown");
    loc.style.backgroundColor = (isError ? "yellow" : "transparent");
    loc.style.paddingLeft = (isError ? ".3em" : "0");
    loc.style.paddingRight = (isError ? ".3em" : "0");
    if (app.toastTimer != null) window.clearTimeout(app.toastTimer);
    if (msg == "") {
        loc.innerHTML = "";
        app.toastTimer = null;
    } else {
        loc.innerHTML = "..." + msg;
        app.toastTimer = window.setTimeout(function() {
            app.toast();
        }, 4000);
    }
}
app.askToAddNewItem = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    app.pendingAction = {action:"addItem"};
    var sel = document.getElementById("selNewItemShape");
    sel.value = (app.isCollectionEmpty(WF.flow.items) ? "pill" : "box");
    document.getElementById("txtNewItemName").value = "";

    document.getElementById("locConfirmAddItem").style.display = "";
}
app.confirmAddNewItem = function(x, y) {
    WF.pushTransaction();
    var name = document.getElementById("txtNewItemName").value.trim();
    if (name == "") name = "New";
    var type = document.getElementById("selNewItemShape").value;
    WF.pickedItem = WF.addItem(x, y, type, name);
    WF.popTransaction();
    app.mode = "design";
    app.editItem();
}

app.editItem = function() {
    app.editing = true;
    app.cancelAction();
    if (app.mode == "design") {
        document.getElementById("itemEditor").style.display = "none";
        if (app.isCollectionEmpty(WF.flow.items) || WF.pickedItem == null) {
            document.getElementById("itemDetailEditor").style.display = "none";
        } else {
            document.getElementById("itemDetailEditor").style.display = "";
        }
    } else {
        if (app.isCollectionEmpty(WF.flow.items)) {
            document.getElementById("itemEditor").style.display = "none";
            app.editing = false;
            //app.askToLoadFlow();
        } else {
            document.getElementById("itemEditor").style.display = "";
        }
        document.getElementById("itemDetailEditor").style.display = "none";
    }
    if (!app.editing) return;
    var itm = WF.pickedItem;
    if (itm == null) {
        app.hideEditor();
        return;
    }
    var frm = document.getElementById("frmWF");
    frm.elements.namedItem("det_item_title").value = itm.title;
    document.getElementById("item_title").innerHTML = itm.title;
    var loc = document.getElementById("locCompleteOptions");
    loc.innerHTML = ""; // Get rid of prior options... leaving the Not completed option there
    var cantChange = !itm.canChangeComplete();
    var inco = document.getElementById("item_not_completed_option");
    inco.checked = !itm.completed;
    if (itm.completed && cantChange) {
        //inco.disabled = true;
    } else {
        inco.disabled = false;
    }
    var doneCodeCount = 0;
    var tbl = document.getElementById("tbl_done_codes");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    for (var key in itm.doneCodes) {
        var oneCode = itm.doneCodes[key];
        var chk = (itm.doneCode == key ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='" + key + "'>" + oneCode.value + "</label>";
        loc.innerHTML += h;

        var tr = tbl.insertRow();
        tr.onclick = function() {app.editDoneCode(this);}
        var td = tr.insertCell();
        td.innerHTML = key;
        td.className = "anchor";
        td = tr.insertCell();
        td.innerHTML = oneCode.value;
        td.className = "anchor";

        doneCodeCount++;
    }
    if (doneCodeCount == 0) {
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        td.colSpan = "2";
        td.innerHTML = "No done codes defined";
        td.style.color = "grey";

        var chk = (itm.completed ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='Y'>Completed</label>";
        loc.innerHTML += h;
    }
    //document.getElementById("locCannotUncompleteMessage").style.display = (itm.canChangeComplete() ? "none" : "");
    if (itm.unblockIfAnyCompleted) {
        document.getElementById("item_block_type_any").checked = true;
    } else {
        document.getElementById("item_block_type_all").checked = true;
    }
    frm.elements.namedItem("item_shape").value = itm.shape;
    // Blocks / Blocked Bys
    var loc = document.getElementById("locBlockedByList");
    loc.innerHTML = "";
    for (var id in itm.blockedBy) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = itm.blockedBy[other.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var link = "<div style='width:100%; padding-bottom:.2em; margin-bottom:.3em; border-bottom:1px dotted silver;'>";
        link += "<span class='anchor' onclick='app.askToRemoveLink(\"blockBy\"," + other.id + ")' style='color:red;font-weight:bold'>&times;</span>";
        link += " <span class='anchor' onclick='app.editLink(\"blockedby\"," + other.id + ")'>" + title + "</span>";
        link += "</div>";
        loc.innerHTML += link;
    }
    var loc = document.getElementById("locBlocksList");
    loc.innerHTML = "";
    for (var id in itm.blocks) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = other.blockedBy[itm.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var link = "<div style='width:100%; padding-bottom:.2em; margin-bottom:.3em; border-bottom:1px dotted silver;'>";
        link += "<span class='anchor' onclick='app.askToRemoveLink(\"blocks\"," + other.id + ")' style='color:red;font-weight:bold'>&times;</span>";
        link += " <span class='anchor' onclick='app.editLink(\"blocks\"," + other.id + ")'>" + title + "</span>";
        link += "</div>";
        loc.innerHTML += link;
    }
}
app.hideEditor = function() {
    app.editing = false;
    document.getElementById("itemEditor").style.display = "none";
    document.getElementById("itemDetailEditor").style.display = "none";
}
app.editDoneCode = function(el) {
    app.cancelAction();
    var code = null;
    var val = "";
    if (el != undefined) { // click event is tied to the TR element
        code = el.cells[0].innerText;
        val = el.cells[1].innerText;
    }
    document.getElementById("txtEditDoneCode").value = (code == null ? "" : code);
    document.getElementById("txtEditDoneValue").value = val;
    app.pendingAction = {action:"editDoneCode", code:code, value:val};
    document.getElementById("locEditDoneCode").style.display = "";
}
app.setDoneCode = function() {
    var codes = WF.pickedItem.doneCodes;
    var act = app.pendingAction;
    var newCode = document.getElementById("txtEditDoneCode").value.trim();
    var newVal = document.getElementById("txtEditDoneValue").value.trim();
    if (act.code == null) {
        if (newCode == "") {
            app.cancelAction();
        } else {
            if (codes[newCode] != null) {
                app.toast("That done code is already used on this item", true);
            } else {
                codes[newCode] = {code:newCode, value:newVal}
                app.editItem();
            }
        }
    } else {
        if (newCode == "") {
            // I the item was completed with this code, throw an error
            if (WF.pickedItem.doneCode == act.code) {
                app.toast("Done code '" + act.code + "' cannot be deleted because it is set as this items done code", true);
                return;
            }
            delete codes[act.code];
            // Remove anywhere it was used
            for (var id in WF.pickedItem.blockedBy) {
                var link = WF.pickedItem.blockedBy[id];
                if (link.allowCodes != null && link.allowCodes[act.code] != undefined) {
                    delete link.allowCodes[act.code];
                }
            }
            app.editItem();
        } else {
            if (newCode == act.code) {
                codes[act.code].value = newVal;
                app.editItem();
            } else if (codes[newCode] != null) {
                app.toast("That done code is already used on this item", true);
            } else {
                delete codes[act.code];
                codes[newCode] = {code:newCode, value:newVal}
                // Reploace old witth new everywhere it is referenced
                for (var id in WF.pickedItem.blocks) {
                    var blkitm = WF.flow.items[id];
                    var link = blkitm.blockedBy[WF.pickedItem.id];
                    if (link.allowCodes != null) {
                        var curList = link.allowCodes.split(",");
                        if (curList.indexOf(act.code) >= 0) {
                            var newList = curList.filter(cod => cod != act.code);
                            newList.push(newCode);
                            link.allowCodes = newList.join(",");
                        }
                    }
                }
                app.editItem();
            }
        }
    }
    WF.drawCanvas();
}
app.askToAddLink = function(type) {
    app.cancelAction(false);
    app.pendingAction = {action:"addLink", type:type};
    document.getElementById("locConfirmAddLink").style.display = "";
    var msg = "Add " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    msg += "'" + WF.pickedItem.title + "' by clicking on the other item";
    document.getElementById("locConfirmAddLinkMessage").innerHTML = msg;

}
app.saveEditedLink = function() {
    var blockingItem = app.pendingAction.blocking;
    var blockedItem = app.pendingAction.blocked;
    var frm = document.getElementById("locEditLink");
    var chks = frm.elements['editLinkRow[]'];
    var rslt = "";
    if (chks == undefined) {
        rslt = "";
    } else {
        if (chks.length == undefined) { // Not a list... just a ceheckbox
            rslt = chks.value;
        } else {
            for (var i = 0; i < chks.length; i++) {
                var chk = chks[i];
                if (chk.checked) {
                    if (rslt != "") rslt += ",";
                    rslt += chk.value;
                }
            }
        }
    }
    if (rslt == "") rslt = null;
    blockedItem.blockedBy[blockingItem.id].allowCodes = rslt;
    app.editItem();
    WF.drawCanvas();
    //app.toast(rslt);
}
app.editLink = function(type,toItem) {
    app.debug("Started edit link method");
    app.cancelAction();
    var blockedItem = null;
    var blockingItem = null;
    toItem = WF.flow.items[toItem];
    if (type == "blocks") {
        blockedItem = toItem;
        blockingItem = WF.pickedItem;
    } else {
        blockedItem = WF.pickedItem;
        blockingItem = toItem;
    }
    var tbl = document.getElementById("tbl_link_codes");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    var numCodes = 0;
    for (var key in blockingItem.doneCodes) {
        var oneCode = blockingItem.doneCodes[key];
        numCodes++;
        var chk = false; // See if this code is already marked as an allowed code
        var allowCodes = blockedItem.blockedBy[blockingItem.id].allowCodes;
        if (allowCodes != null) {
            var lst = allowCodes.split(",");
            if (lst.indexOf(key) >= 0) chk = true;
        }
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        var cbox = document.createElement("input");
        cbox.checked = chk;
        cbox.type = "checkbox";
        cbox.name = "editLinkRow[]";
        cbox.value = key;
        td.appendChild(cbox);
        td = tr.insertCell();
        td.innerHTML = key;
        td.className = "anchor";
        td = tr.insertCell();
        td.innerHTML = oneCode.value;
        td.className = "anchor";
    }
    if (numCodes == 0) {
        app.askToRemoveLink(type, toItem.id);
    } else {
        var msg = "Edit link from '" + blockingItem.title + "' to '" + blockedItem.title + "'";
        app.pendingAction = {action:"editLink", blocked:blockedItem, blocking:blockingItem};
        document.getElementById("locEditLink").style.display = "";
        document.getElementById("locEditLinkMessage").innerHTML = msg;
        app.debug("Showing edit link dialog");
    }
}
app.askToRemoveLink = function(type, id) {
    app.cancelAction(false);
    app.pendingAction = {action:"removeLink", type:type, id:id};
    document.getElementById("locConfirmRemoveLink").style.display = "";
    var msg = "Remove " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    var itm = WF.flow.items[id];
    msg += "'" + itm.title + "'";
    document.getElementById("locConfirmRemoveLinkMessage").innerHTML = msg;
}
app.confirmAddLink = function(itm) {
    var added = false;
    if (itm != null) {
        if (itm == WF.pickedItem) {
            app.toast("You cannot link an item to itself", true);
        } else {
            var hasDoneCodes = false;
            var action = app.pendingAction.type;
            if (action == "blocks") {
                added = WF.pickedItem.addBlock(itm);
                if (!app.isCollectionEmpty(WF.pickedItem.doneCodes))  hasDoneCodes = true;
            } else {
                added = WF.pickedItem.addBlockedBy(itm);
                if (!app.isCollectionEmpty(itm.doneCodes))  hasDoneCodes = true;
            }
            if (added) {
                WF.drawCanvas();
                app.editItem();
                //app.cancelAction(); 
                if (hasDoneCodes) {
                    app.editLink(action, itm.id);
                }
            } else {
                if (!added) app.toast("Link already present", true);
            }
        }
    } else {
        app.toast("Add link cancelled");
        app.cancelAction();
    }

}
app.confirmRemoveLink = function() {
    var type = app.pendingAction.type;
    var id = app.pendingAction.id;
    if (type == "blocks") {
        WF.pickedItem.removeBlock(WF.flow.items[id]);
    } else {
        WF.pickedItem.removeBlockedBy(WF.flow.items[id]);
    }
    WF.drawCanvas();
    app.editItem();
    app.cancelAction();
}
app.askToStartNew = function() {
    app.cancelAction(false);
    document.getElementById("locConfirmStartNew").style.display = "";
}
app.confirmStartNew = function() {
    WF.pickedItem = null;
    WF.flow = {
        title: "",
        items: {}
    }
    app.cancelAction();
    document.getElementById("wf_title").value = WF.flow.title;
    WF.drawCanvas();
    app.toggleMode("design");
    app.askToAddNewItem();
}
app.askToDeleteItem = function() {
    app.cancelAction(false);
    app.pendingAction = {action:"deleteItem"};
    document.getElementById("locConfirmDelete").style.display = "";
}
app.confirmDeleteItem = function() {
    WF.pushTransaction();
    var itm = WF.pickedItem;
    for (var id in WF.flow.items) {
        var other = WF.flow.items[id];
        other.removeBlockedBy(itm);
        other.removeBlock(itm);
    }
    delete WF.flow.items[itm.id];
    WF.pickedItem = null;
    WF.popTransaction();
    app.editItem();
    app.cancelAction();
    //if (Object.keys(WF.flow.items).length == 0) {
    //    app.askToLoadFlow();
    //}
}
app.cancelAction = function(showInstructions) {
    app.debug("Cancel Action (instructions: " + showInstructions + ")");
    var forceInstructions = (showInstructions != undefined);
    if (showInstructions == undefined) showInstructions = false;
    app.pendingAction = null;
    document.getElementById("locConfirmDelete").style.display = "none";
    document.getElementById("locConfirmRemoveLink").style.display = "none";
    document.getElementById("locConfirmAddLink").style.display = "none";
    document.getElementById("locConfirmAddItem").style.display = "none";
    document.getElementById("locConfirmAddItem").style.display = "none";
    document.getElementById("locEditDoneCode").style.display = "none";
    document.getElementById("locEditLink").style.display = "none";  
    document.getElementById("locLoadLocal").style.display = "none";  
    document.getElementById("locSaveLocal").style.display = "none"; 
    document.getElementById("locConfirmStartNew").style.display = "none"; 
    document.getElementById("locInstructionsWorking").style.display = "none";
    document.getElementById("locInstructionsDesign").style.display = "none";
    var show = false;
    if (forceInstructions && showInstructions) {
        show = true;
    } else if (!forceInstructions && WF.pickedItem == null) {
        show = true;
    }
    if (show) {
        if (app.mode == "work") {
            document.getElementById("locInstructionsWorking").style.display = "";
        } else {
            document.getElementById("locInstructionsDesign").style.display = "";                    
        }
    }
}
app.updateWFTitle = function(el) {
    WF.flow.title = el.value;
    var tbox = document.getElementById("wf_title");
    if (tbox.id != el.id) {
        tbox.value = el.value;
    }
    var sel = document.getElementById("selLoadLocal");
    sel.options[sel.selectedIndex].innerHTML = el.title;

    WF.drawCanvas();
}
app.updateItemTitle = function(el) {
    WF.pickedItem.title = el.value;
    WF.drawCanvas();
}
app.updateItemShape = function(el) {
    WF.pickedItem.shape = el.value;
    WF.drawCanvas();
}
app.updateBlockType = function(el) {
    WF.pickedItem.unblockIfAnyCompleted = (el.value == "any");
    app.editItem();
    WF.drawCanvas();
}
app.updateItemComplete = function(el) {
    var val = el.value;
    if (!app.isCollectionEmpty(WF.pickedItem.doneCodes)) {
        if (val == '') {
            WF.pickedItem.doneCode = null;
            WF.pickedItem.completed = false;
        } else {
            WF.pickedItem.doneCode = val;
            WF.pickedItem.completed = true;
        }
    } else {
        WF.pickedItem.completed = (val != '');
    }
    app.setFutureItemsIncomplete();
    app.editItem();
    WF.drawCanvas();
}
app.askToSaveFlow = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locSaveLocal").style.display = "";
    document.getElementById("locSaveToClipboard").value = JSON.stringify(WF.flow);
}
app.askToLoadFlow = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locLoadLocal").style.display = "";
    document.getElementById("locLoadFromClipboard").value = "";
}
app.saveLocal = function() {
    if (WFUI.dragstart != null) return;
    var sel = document.getElementById("selLoadLocal");
    var slot = sel.value;
    var optnum = sel.selectedIndex;
    var opt = sel.options[optnum];
    opt.innerHTML = (optnum+1) + ". " + WF.flow.title;
    if (app.isCollectionEmpty(WF.flow.items)) {
        app.localStorage.slots[slot] = null;
    } else {
        app.localStorage.slots[slot] = WF.flow;
    }
    app.localStorage.slot = slot;
    var string = JSON.stringify(app.localStorage);
    localStorage.setItem("WF2_FLOWDATA", string);
    //app.cancelAction();
}
app.loadFromTextbox = function() {
    app.saveLocal();
    var json = document.getElementById("locLoadFromClipboard").value.trim();
    if (json == "") json = "This should not load";
    WF.flow = {
        title: "Workflow Sample",
        items: {}
    }
    WF.pickedItem = null
    try {
        var tmpFlow = JSON.parse(json);
        var sel = document.getElementById("selLoadLocal");
        sel.options[sel.selectedIndex].innerHTML = tmpFlow.title;
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            WF.flow.items[id] = itm;
            itm.id = id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
        app.toast("Loaded!");
        app.cancelAction(true);
        app.repositionCanvas();
    } catch(err) {
        app.loadLocal(); // Restore what was there
        app.toast("Error loading contents of text area", true);
        WF.popTransaction(); // Probably failed after push transaction
    }
    document.getElementById("wf_title").value = WF.flow.title;
    //app.editItem();
}
app.loadLocal = function() {
    var sel = document.getElementById("selLoadLocal");
    var spot = parseInt(sel.value,10);
    if (spot == "") return;
    var tmpFlow = app.localStorage.slots[spot];
    WF.flow = { title: "", items: {} }
    WF.pickedItem = null;
    try {
        tmpFlow.slot = spot;
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            WF.flow.items[id] = itm;
            itm.id = id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
    } catch(err) {
        WF.popTransaction(); // Probably failed after push transaction
       // WF.pushTransaction();
       // var itm1 = WF.addItem(260, 200, "pill", "Start");
       // var itm2 = WF.addItem(400, 200, "box", "Do Something");
       // itm2.addBlockedBy(itm1);
       // var itm3 = WF.addItem(540, 200, "pill", "End");
       // itm3.addBlockedBy(itm2);

       // WF.popTransaction();
    }
    document.getElementById("wf_title").value = WF.flow.title;
    if (spot != undefined) app.toast("Loaded '" + WF.flow.title + "'");
    //app.cancelAction(true);

    if (app.isCollectionEmpty(WF.flow.items)) {
        if (app.mode == "work") {
            app.askToLoadFlow();
        }
    }
    app.repositionCanvas();
}
app.setFutureItemsIncomplete = function(itm) {
    var calledWithItem = (!itm == undefined);
    if (itm == undefined) itm = WF.pickedItem;
    for (var key in itm.blocks) {
        var bby = WF.flow.items[key];
        if (bby.completed) {
            var okToCancel = true;
            if (bby.unblockIfAnyCompleted) {
                for (var key2 in bby.blockedBy) {
                    var backone = WF.flow.items[key2];
                    if (backone.id != itm.id) {
                        if (backone.completed) {
                            okToCancel = false;
                            break;
                        }
                    }
                }
            }
            if (okToCancel) {
                bby.doneCode = null;
                bby.completed = false;
                app.setFutureItemsIncomplete(bby);
            }
        } else {
            if (!app.isCollectionEmpty(bby.blocks)) isLastItem = false;
        }
    }
    if (!calledWithItem && WF.pickedItem.completed) {
        // If the only item left does not have any blocks
        // then it can just be completed
        if (app.collectionSize(WF.pickedItem.doneCodes) < 2) {
            // Simple complete true/false
            for (var bid in WF.pickedItem.blocks) {
                var blk = WF.flow.items[bid];
                if (app.isCollectionEmpty(blk.blocks)) {
                    if (blk.unblockIfAnyCompleted) {
                        // ANY is set, and we already know THIS one has
                        // been completed, so we are ready to mark as complete
                        blk.doneCode = null;
                        blk.completed = true;
                    } else {
                        var alldone = true; // toggle if any are incomplete
                        for (var backid in blk.blockedBy) {
                            var back = WF.flow.items[backid];
                            if (!back.completed) {
                                alldone = false;
                                break;
                            }
                        }
                        if (alldone) {
                            blk.doneCode = null;
                            blk.completed = true;
                        }
                    }
                }
            }
        } else {
            // Multiple done codes
            var done = WF.pickedItem.doneCode;
            for (var id in WF.pickedItem.blocks) {
                var blk = WF.flow.items[id];
                var link = blk.blockedBy[WF.pickedItem.id];
                if (link.allowCodes == null) continue;
                var acodes = link.allowCodes.split(",");
                if (acodes.indexOf(done) >= 0) {
                    if (app.isCollectionEmpty(blk.blocks)) {
                        if (blk.unblockIfAnyCompleted) {
                            // ANY is set, and we already know THIS one has
                            // been completed, so we are ready to mark as complete
                            blk.doneCode = null;
                            blk.completed = true;
                        } else {
                            var alldone = true; // toggle if any are incomplete
                            for (var backid in blk.blockedBy) {
                                var back = WF.flow.items[backid];
                                if (!back.completed) {
                                    alldone = false;
                                    break;
                                }
                            }
                            if (alldone) {
                                blk.doneCode = null;
                                blk.completed = true;
                            }
                        }
                    }
                }
            }
        }
        
        WF.drawCanvas();
    }
}
app.repositionCanvas = function() {
    //var container = document.getElementById("canvasContainer");
    //var can = WFUI.canvas;
    //can.style.left = ((container.offsetWidth / 2) - (can.offsetWidth / 2)) + "px";
    //can.offsetTop = "0px";
}
app.collectionItem = function(col, pos) {
    return Object.keys(col)[pos];
}
app.collectionSize = function(col) {
    return Object.keys(col).length;
}
app.isCollectionEmpty = function(col) {
    return (app.collectionSize(col) == 0);
}
app.isOneOf = function(val,opts) {
    return opts.split(",").indexOf(val) >= 0;
}

app.updateLocalStorage = function() {
    localStorage.removeItem("WF2_FLOW_WORKING");
    for (var i = 0; i < 10; i++) {
        localStorage.removeItem("WF2_FLOW_" + i);
    }
}

app.popupSaveWFTitle = function() {
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    var tbox = frm.elements["TEST_INPUT"];
    app.updateWFTitle(tbox);
    app.closePopup();
}
app.popupWFTitle = function() {
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    if (frm != undefined) document.body.removeChild(frm);
    frm = document.createElement("form");
    var canBB = WFUI.canvas.getBoundingClientRect();
    frm.style.position = "absolute";
    frm.style.top = (canBB.top + 10) + "px";
    frm.style.left = canBB.left + "px";
    frm.onsubmit = function(event) {
        event.preventDefault;
        testInput();
    }
    frm.id = "BW_WF2_POPUPFORM";
    var tbox = document.createElement("input");
    tbox.style.width = WFUI.canvas.width + "px";
    tbox.style.fontSize = "20pt";
    tbox.style.textAlign = "center";
    //tbox.style.background = "transparent";
    tbox.value = WF.flow.title;
    tbox.name = "TEST_INPUT";
    frm.appendChild(tbox);
    var btn = document.createElement("button");
    btn.onclick = app.popupSaveWFTitle;
    btn.innerHTML = "Save";
    frm.appendChild(btn);
    document.body.appendChild(frm);
    tbox.select(); tbox.focus();
}
app.closePopup = function() {
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    if (frm != undefined) document.body.removeChild(frm);
}

app.clickShift = function(event) {
	var td = event.srcElement;
	var tr = td.parentElement;
	var rn = tr.rowIndex;
	var cn = td.cellIndex;
	if (rn != undefined && cn != undefined) {
		if (rn == 0) {
			if (cn == 0) app.shiftAll("UL")
			else if (cn == 1) app.shiftAll("U")
			else if (cn == 2) app.shiftAll("UR");
		} else if (rn == 1) {
            if (cn == 0) app.shiftAll("L")
            else if (cn == 1) app.shiftCenter();
			else if (cn == 2) app.shiftAll("R");
		} else if (rn == 2) {
			if (cn == 0) app.shiftAll("DL")
			else if (cn == 1) app.shiftAll("D")
			else if (cn == 2) app.shiftAll("DR");
		}
	}
}
app.shiftCenter = function() {
    var minx = 10000;
    var maxx = 0;
    var miny = 10000;
    var maxy = 0;
    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        if (itm.x < minx) minx = itm.x;
        if (itm.x > maxx) maxx = itm.x;
        if (itm.y < miny) miny = itm.y;
        if (itm.y > maxy) maxy = itm.y;
    }
    var width = maxx - minx;
    var left = (WFUI.canvas.width - width) / 2;
    left = (WFUI.spacing * parseInt(left / WFUI.spacing));

    var xoff = left - minx;
    var yoff = 100 - miny; // Leaving room for title

    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        itm.x += xoff;
        itm.y += yoff;
    }
    WF.drawCanvas();
}
app.shiftAll = function (dirs) {
    // If x and y are null then we are shifting everything
    var off = WF.gridsize;
    var xoff = 0;
    var yoff = 0;
    if (app.isOneOf(dirs, "UL,L,DL")) xoff = -off;
    if (app.isOneOf(dirs, "UR,R,DR")) xoff = off;
    if (app.isOneOf(dirs, "UL,U,UR")) yoff = -off;
    if (app.isOneOf(dirs, "DL,D,DR")) yoff = off;
    var canShift = true;
    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        var test = itm.x + xoff;
        if (test < 0 || test > WFUI.canvas.width) canShift = false;
        if (canShift) {
            test = itm.y + yoff;
            if (test < 0 || test > WFUI.canvas.height) canShift = false;
        }
        if (!canShift) break;
    }
    if (canShift) {
        for (var id in WF.flow.items) {
            var itm = WF.flow.items[id];
            itm.x += xoff;
            itm.y += yoff;
        }
        WF.drawCanvas();
    } else {
        app.toast("Shifting would make items go off page. Shift cancelled.", true);
    }
}
