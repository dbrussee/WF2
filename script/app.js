window.app = {
    pendingAction: null,
    mode: "work" // or "design"
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
    app.cancelAction();
    app.hideEditor();
    app.pendingAction = {action:"addItem"};
    document.getElementById("locConfirmAddItem").style.display = "";
}
app.confirmAddNewItem = function(x, y) {
    WF.pushTransaction();
    var type = (Object.keys(WF.flow.items).length == 0 ? "pill" : "box");
    WF.pickedItem = WF.addItem(x, y, type, "New");
    WF.popTransaction();
    app.mode = "design";
    app.editItem();
}

app.editItem = function() {
    if (app.mode == "design") {
        document.getElementById("itemEditor").style.display = "none";
        document.getElementById("itemDetailEditor").style.display = "";
    } else {
        document.getElementById("itemEditor").style.display = "";
        document.getElementById("itemDetailEditor").style.display = "none";
    }
    var itm = WF.pickedItem;
    var frm = document.getElementById("frmWF");
    frm.elements.namedItem("det_item_title").value = itm.title;
    document.getElementById("item_title").innerHTML = itm.title;
    var loc = document.getElementById("locCompleteOptions");
    loc.innerHTML = ""; // Get rid of prior options... leaving the Not completed option there
    var cantChange = !itm.canChangeComplete();
    var inco = document.getElementById("item_not_completed_option");
    inco.checked = !itm.completed;
    if (itm.completed && cantChange) {
        inco.disabled = true;
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
            if (cantChange) dis = " disabled";
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
        var chk = (itm.completed ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='Y'>Completed</label>";
        loc.innerHTML += h;
    }
    document.getElementById("locCannotUncompleteMessage").style.display = (itm.canChangeComplete() ? "none" : "");
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
        var link = "<span class='anchor' onclick='app.editLink(\"blockedby\"," + other.id + ")'>" + title + "</span>";
        link += " <span class='anchor' onclick='app.askToRemoveLink(\"blockBy\"," + other.id + ")' style='color:red;font-weight:bold'>X<span>";
        loc.innerHTML += "<br/>" + link;
    }
    var loc = document.getElementById("locBlocksList");
    loc.innerHTML = "";
    for (var id in itm.blocks) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = other.blockedBy[itm.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var link = "<span class='anchor' onclick='app.editLink(\"blocks\"," + other.id + ")'>" + title + "</span>";
        link += " <span class='anchor' onclick='app.askToRemoveLink(\"blocks\"," + other.id + ")' style='color:red;font-weight:bold'>X<span>";
        loc.innerHTML += "<br/>" + link;
    }
    app.cancelAction();
}
app.hideEditor = function() {
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
            delete codes[act.code];
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
                app.editItem();
            }
        }
    }
    WF.drawCanvas();
}
app.askToAddLink = function(type) {
    app.cancelAction();
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
            if (allowCodes.indexOf(key) >= 0) chk = true;
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
    }
}
app.askToRemoveLink = function(type, id) {
    app.cancelAction();
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
            if (app.pendingAction.type == "blocks") {
                added = WF.pickedItem.addBlock(itm);
            } else {
                added = WF.pickedItem.addBlockedBy(itm);
            }
            if (added) {
                WF.drawCanvas();
                app.editItem();
                app.cancelAction();            
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
app.askToDeleteItem = function() {
    app.cancelAction();
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
    WF.popTransaction()
    app.hideEditor();
    app.cancelAction();
}
app.cancelAction = function() {
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
}
app.updateWFTitle = function(el) {
    WF.flow.title = el.value;
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
    if (Object.keys(WF.pickedItem.doneCodes).length > 0 ) {
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
    app.editItem();
    WF.drawCanvas();
}
app.askToSaveFlow = function() {
    app.cancelAction();
    document.getElementById("locSaveLocal").style.display = "";
    document.getElementById("locSaveToClipboard").value = JSON.stringify(WF.flow);
}
app.askToLoadFlow = function() {
    app.cancelAction();
    document.getElementById("locLoadLocal").style.display = "";
}
app.saveLocal = function(spot) {
    var tag = "WF2_FLOW_" + spot;
    if (spot == undefined) {
        tag = "WF2_FLOW_WORKING";
    }
    localStorage.setItem(tag, JSON.stringify(WF.flow));
    if (spot != undefined) app.toast("Saved flow to local spot " + (spot + 1));
    app.cancelAction();
}
app.loadFromTextbox = function() {
    app.saveLocal();
    var json = document.getElementById("locLoadFromClipboard").value.trim();
    if (json == "") json = "This should not load";
    WF.flow = {
        title: "Workflow Sample",
        items: {}
    }
    try {
        var tmpFlow = JSON.parse(json);
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = WF.addItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            itm.id = tmpItm.id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
        app.toast("Loaded!");
        app.cancelAction();
    } catch {
        app.loadLocal(); // Restore what was there
        app.toast("Error loading contents of text area", true);
        WF.popTransaction(); // Probably failed after push transaction
    }

}
app.loadLocal = function(spot) {
    var tag = "WF2_FLOW_" + spot;
    if (spot == undefined) {
        tag = "WF2_FLOW_WORKING";
    }
    var json = localStorage.getItem(tag);
    WF.flow = {
        title: "Workflow Sample",
        items: {}
    }
    try {
        var tmpFlow = JSON.parse(json);
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = WF.addItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            itm.id = tmpItm.id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
    } catch {
        WF.popTransaction(); // Probably failed after push transaction
        WF.pushTransaction();
        WF.addItem(400, 200, "pill", "Start");
        WF.popTransaction();
    }
    if (spot != undefined) app.toast("Saved flow to local spot " + (spot + 1));
    app.cancelAction();
}

app.isCollectionEmpty = function(col) {
    return (Object.keys(col).length == 0 );
}
app.isOneOf = function(val,opts) {
    return opts.split(",").indexOf(val) >= 0;
}