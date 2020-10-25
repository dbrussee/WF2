var WF = {
    flow: {
        title: "Workflow Sample",
        items: {}
    },
    canvas: null,
    ctx: null,
    pickedItem: null,
    pickHitBox: 80,
    gridsize: 20,
    transactionLevel: 0,
    inTransaction: false,
    eventTarget: null
}
WF.handleMouseMove = function(event) {
    if (app.mode == "work") return false;
    var can = WFUI.canvas;
    if (WF.pickedItem == null) return false; // Nothing picked... nothing to drag
    if (WFUI.dragstart == null) return false; // Still nothing to drag
    var x = (event.clientX - can.parentElement.offsetLeft + can.parentElement.parentElement.scrollLeft) / app.scale;
    var y = (event.clientY - can.parentElement.offsetTop + can.parentElement.parentElement.scrollTop) / app.scale;
    if (WFUI.dragstart.item == null) {
        var offset = WFUI.dragstart.offset;
        var origin = WFUI.dragstart.origin;
        // figure out possible new postion
        var newx = parseInt(((origin.x + offset.x) + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
        var newy = parseInt(((origin.y + offset.y) + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
        // How far away is the new possible position from current postion
        var dist = WFUI.lineLength(origin.x, origin.y, x, y);
        if (dist > WF.gridsize) {
            // Distance is > gridsize
            WFUI.dragstart.item = WF.pickedItem;
        } else {
            return;
        }
    }
    WF.pickedItem.x = x + WFUI.dragstart.offset.x;
    WF.pickedItem.y = y + WFUI.dragstart.offset.y;
    WF.drawCanvas();
    return true;
}
WF.handleMouseUp = function(event) {
    var can = WFUI.canvas;
    if (WFUI.dragstart != null) {
        if (WFUI.dragstart.item != null) {
            var newx = parseInt((WF.pickedItem.x + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
            var newy = parseInt((WF.pickedItem.y + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
            WF.pickedItem.x = newx;
            WF.pickedItem.y = newy;
            WFUI.dragstart.item = null;
            WF.drawCanvas();
        }
        WFUI.dragstart = null;
        app.saveLocal();
    }
}
WF.handleMouseDown = function(event) {
    var can = WFUI.canvas;
    // Inidicate where the drag started.
    // NOTE: Dragging does not commence until movement is made
    WFUI.dragstart = {
        item:null, 
        origin:{x:0,y:0},
        offset:{x:0,y:0}
    };
    var x = (event.clientX - can.parentElement.offsetLeft + can.parentElement.parentElement.scrollLeft) / app.scale;
    var y = (event.clientY - can.parentElement.offsetTop + can.parentElement.parentElement.scrollTop) / app.scale;

    if (y < 45) {
        app.popupWFTitle();
        return;
    }

    var itm = WFUI.getItemUnderXY(x, y);
    if (app.pendingAction != null) {
        if (app.pendingAction.action == "addLink") {
            app.confirmAddLink(itm);
            return;
        } else if (app.pendingAction.action == "addItem") {
            if (itm == null) {
                var newx = parseInt((x + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                var newy = parseInt((y + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                itm = app.confirmAddNewItem(newx, newy);
            } else {
                app.toast("Add item action cancelled because you clicked on an item");
                app.cancelAction();
            }
        }
    }

    if (itm == null) {
        // User did not click on an item. However, they might have clicked on 
        // a link. If so, handle it. If not, handle it as an an item picked with a null;
        var rslt = WFUI.getLinkUnderXY(x,y);
        if (rslt.item != null) {
            WF.dispatchEvent("linkpicked", rslt);
            return;
        }
    } else {
        // Store where the user clicked to start
        WFUI.dragstart.origin = {x:x, y:y};
        // figure offset from center of item to where user clicked
        // values represent and adjustment from the actual x, y to the item's
        // center x and y.
        WFUI.dragstart.offset = {x:itm.x - x, y:itm.y - y}
    }
    var prev = WF.pickedItem;
    WF.pickedItem = itm;
    WF.drawCanvas();
    WF.dispatchEvent("itempicked", {item:itm, prev:prev});
    app.closePopup();
}
WF.pushTransaction = function() {
    WF.transactionLevel++;
    WF.inTransaction = true;
}
WF.popTransaction = function() {
    if (WF.transactionLevel > 0) WF.transactionLevel--;
    WF.inTransaction = WF.transactionLevel > 0;
    if (!WF.inTransaction) WF.drawCanvas();
}
var WFItem = function(x, y, shape, title) {
    var tmpid = 0;
    while(WF.flow.items[tmpid] != null) tmpid++;
    this.id = tmpid;
    this.x = x;
    this.y = y;
    this.shape = shape;
    this.title = title;
    // If doneCodes is empty then the only value kept 
    // for completed is this value. However, if doneCodes
    // has at least one value, completed is true for any of
    // those values being set... and if none are set... completed
    // is false
    this.completed = false;
    // doneCode cause the completion to be a selection
    // of a list of items. If there is only one item in doneCodes
    // then the only option is Not completed, or the value in 
    // the doneCodes collection.
    this.doneCodes = {};
    // ex: {
    //    AAA: {code:AAA, value:'First Option'},
    //    BBB: {code:BBB, value:'Second Option'},
    //    CCC: {code:CCC, value:'Third Option'}
    // }

    // If doneCodes has values and one of them are picked,
    // then doneCode is set to that value.
    this.doneCode = null;
    // ex: 'AAA'

    // true means that if there are multiple blocks, this item
    // is considered unblocked if even 1 of them are completed.
    // false means that they must ALL be completed
    this.unblockIfAnyCompleted = false;

    // Items this item is directly blocked by.
    // Each item in the array will be an ID assigned to
    // another item and an optional list of done codes
    // that indicate an acceptable "done" condition.
    this.blockedBy = {};
    // ex: {} -> No blocked by links
    // ex: {{id:2,codes:null}} -> Blocked by item id 2 with any done code
    // ex: {{id:2,codes:'AAA,BBB'}}
    // Note: The codes refer to "done codes" from the item with the id
    // referenced in the item blockedBy array item itself.

    // A reciprocal list from the blockedBy list. 
    // If an item with id 4 has a blockedBy list that has {id:2, codes:null}
    // then blocks on item with id 2 will contain the value
    // [4] (it may contain other ids as well)
    // Note: The blocks list does not contain any done codes
    this.blocks = {};
}
WFItem.prototype.canChangeComplete = function() {
    var anyCompleted = false;
    rslt = true;
    for (var otherid in this.blocks) {
        var other = WF.flow.items[otherid];
        if (other.completed) {
            rslt = false;
            break;
        }
    }
    return rslt;
}
WFItem.prototype.isBlocked = function() {
    var blocked = false;
    var anyDone = false;
    var allDone = true; // Turned off as found
    for (var bbnum in this.blockedBy) {
        var link = this.blockedBy[bbnum];
        var other = WF.flow.items[bbnum];
        if (other.completed) {
            if (link.allowCodes == null) {
                anyDone = true;
            } else {
                if (app.isOneOf(other.doneCode, link.allowCodes)) {
                    anyDone = true;
                } else {
                    allDone = false;
                }
            }
        } else {
            allDone = false;
        }
    }
    if (this.unblockIfAnyCompleted) {
        blocked = !anyDone;
    } else {
        blocked = !allDone;
    }
    return blocked;
}
WFItem.prototype.addBlock = function(itm, allowCodes) {
    return itm.addBlockedBy(this, allowCodes);
}
WFItem.prototype.removeBlock = function(itm) {
    itm.removeBlockedBy(this);
}
WFItem.prototype.addBlockedBy = function(itm, allowCodes) {
    if (this.blockedBy[itm.id] == null && this.blocks[itm.id] == null) {
        if (allowCodes == undefined) allowCodes = null;
        this.blockedBy[itm.id] = {id:itm.id, allowCodes:allowCodes}
        itm.blocks[this.id] = {id:this.id}
        return true;
    } else {
        return false;
    }
}
WFItem.prototype.removeBlockedBy = function(itm) {
    delete this.blockedBy[itm.id];
    delete itm.blocks[this.id];
}
WF.addItem = function(x, y, shape, title) {
    var itm = new WFItem(x, y, shape, title);
    if (shape == "diamond") {
        itm.doneCodes['Yes'] = {code:'Yes',value:'Yes'}
        itm.doneCodes['No'] = {code:'No',value:'No'}
    }
    WF.flow.items[itm.id] = itm;
    WF.pickedItem = itm;
    if (!WF.inTransaction) WF.drawCanvas();
    return itm;
}
WF.drawCanvas = function() {
    app.saveLocal(); // Working 
    WFUI.drawCanvas(WF.flow.items);
}
function initWF() {
    app.setMode("work");
    window.addEventListener("keydown", function(event) {
        if (event.srcElement != document.body) return;
        event.preventDefault();
        switch(event.keyCode) {
            case 48: // 0 (10th item)
            var sel = document.getElementById("selLoadLocal");
                sel.selectedIndex = 9; // 10th item
                app.loadLocal();
                break;
            case 49: //1-9 flow load
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
                var sel = document.getElementById("selLoadLocal");
                sel.selectedIndex = (event.keyCode - 49);
                app.loadLocal();
                break;
            case 27: // escape key
                WF.pickedItem = null;
                app.cancelAction();
                app.hideEditor();
                WF.drawCanvas();
                break;
            case 37: // left arrow
                if (event.shiftKey) app.shiftAll("L");
                break;
            case 39: // right arrow
                if (event.shiftKey) app.shiftAll("R");
                break;
            case 38: // up arrow
                if (event.shiftKey) app.shiftAll("U");
                break;
            case 40: // down arrow
                if (event.shiftKey) app.shiftAll("D");
                break;
            case 67: // c (Center items)
                if (event.shiftKey) app.shiftCenter();
                break;
            case 191: // forward slash
                app.setMode();
                break;
            case 84: // t (Edit title)
                app.popupWFTitle();
                break;
            case 32: // space bar
                app.toggleComplete();
                break;
            case 8: // backspace
            case 46: // delete
                app.askToDeleteItem();
                break;
            case 13: // enter key
                break;
            case 65: // a (add item)
                app.askToAddNewItem();
                break;
            case 66: // b (Block link)
                app.askToAddLink("blocks");
                break;
            case 69: // e (Edit item)
                app.editItem();
                break;
            case 83: // s (item shape)
                app.cycleItemShape();
                break;
            case 89: // y (bloked bY link)
                app.askToAddLink("blockby");
                break;
            case 78: // n (find / pick next unblocked)
                app.pickNext();
                break;
            case 82: // r (reset)
                app.resetFlow();
                break;
            default:
                //console.log(event.keyCode + " pressed");
        }
    });
    app.updateLocalStorage();

    var filedrag = document.getElementById("fileDropZone");
    filedrag.addEventListener("drop", app.loadFromDroppedFile, false);
    filedrag.addEventListener("dragover", function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; 
    });
    document.body.addEventListener("drop", app.blockWindowDrop, false);
    document.body.addEventListener("dragover", function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; 
    });
 
    var json = localStorage.getItem("WF2_FLOWDATA");
    var sel = document.getElementById("selLoadLocal");
    if (json != undefined) {
        app.localStorage = JSON.parse(json);
        for (var i = 0; i < 10; i++) {
            var flow = app.localStorage.slots[i+1];
            if (flow != null) {
                sel.options[i].innerHTML = (i + 1) + ". " + flow.title;
            }
        }
    }
    sel.value = app.localStorage.slot;

    WF.createCanvas();

    WF.eventTarget = document.createTextNode(null); // Dummy target for events
    // Pass EventTarget interface calls to DOM EventTarget object
    WF.addEventListener = WF.eventTarget.addEventListener.bind(WF.eventTarget);
    WF.removeEventListener = WF.eventTarget.removeEventListener.bind(WF.eventTarget);
    WF.dispatchEvent = function(ename, detail) {
        //console.log("Event: " + ename + ", Detail: " + JSON.stringify(detail));
        WF.eventTarget.dispatchEvent(new CustomEvent(ename, {detail:detail}));
    }
    WF.addEventListener("linkpicked", function(e) {
        var itm = e.detail.item;
        WF.pickedItem = itm;
        var blk = e.detail.blocking;
        if (app.mode == "work") {
            if (itm.isBlocked()) {
                app.toast("Item '" + itm.title + "' status cannot be set because one or more items before it are not completed.", true, 6000);
            } else {
                lnk = blk.blockedBy[itm.id];
                app.toggleComplete(lnk);
            }
        } else {
            app.editLink("blocks",blk.id);
        }
    })
    WF.addEventListener("itempicked", function(e) {
        if (e.detail.item == null) {
            app.pendingAction = null;
        } else {
            //app.toast("Clicked: " + e.detail.item.title);
        }
        if (WF.pickedItem == null) {
            app.hideEditor();
            app.cancelAction(true);
        } else {
            app.editItem();
        }
    });
    WF.addEventListener("linkadded", function(e) {
        //WorkflowUI.drawConnector(e.detail.blockedByStep, e.detail.blockedStep);
    });
    WF.addEventListener("linkremoved", function(e) {
        //WorkflowUI.drawCanvas(this);
    });

    document.getElementById("formContainer").addEventListener("click", function(event) {
        app.closePopup();
    });
    
}

WF.createCanvas = function() {
    var container = document.getElementById("canvasContainer");
    container.innerHTML = "";
    var div = document.createElement("div");
    div.style.cssText = "z-index:1; position:relative; background-color: white; margin: 20px auto";
    div.style.height = (app.page.y * app.scale) + "px";
    div.style.width = (app.page.x * app.scale) + "px";
    container.appendChild(div);

    WFUI.canvas = document.createElement("canvas");
    var can = WFUI.canvas;
    can.style.margin = "0";
    can.height = app.page.y * app.scale;
    can.width = app.page.x * app.scale;
    div.appendChild(can);
    WFUI.ctx = can.getContext('2d');
    WFUI.ctx.scale(app.scale, app.scale);

    can.addEventListener("touchstart", function(event) {
        if (event.touches.length > 1) return; // zoom?
        event.preventDefault();
        WF.handleMouseDown(event.touches[0])
    }, false);
    can.addEventListener("mousedown", function(event) {
        event.preventDefault();
        WF.handleMouseDown(event);
    }, false);
    can.addEventListener("touchend", function(event) {
        event.preventDefault();
        WF.handleMouseUp(event.touches[0]);
    }, false);
    can.addEventListener("mouseup", function(event) {
        event.preventDefault();
        WF.handleMouseUp(event);
    }, false);
    can.addEventListener("mouseout", function(event) {
        var can = WFUI.canvas;
        WFUI.dragstart = null;
        can.style.cursor = "default";
    }, false);
    can.addEventListener("touchmove", function(event) {
        var handled = WF.handleMouseMove(event.touches[0]);
        if (handled) event.preventDefault();
    }, false)
    can.addEventListener("mousemove", function(event) {
        WF.handleMouseMove(event);
        event.preventDefault();
    }, false);

}
