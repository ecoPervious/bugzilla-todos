function Queue() {
  this.items = [];

  _.extend(this, Backbone.Events);
}
Queue.prototype = {
  get updateCount() {
    var count = 0;
    for (var i in this.items) {
      if (this.items[i].new) {
        count++;
      }
    }
    return count;
  },

  newUser: function() {
    this.items = [];
    this.clearUpdates();

    this.shouldDiff = false;
    this.trigger("new-user");
  },

  reset: function(items) {
    if (this.shouldDiff) {
      // check for any new items
      var hasNew = this.markNew(items);
      if (hasNew) {
        this.trigger("update-count-changed");
      }
    }
    else {
      this.shouldDiff = true;
    }
    this.items = items;
    this.trigger("reset", items);
  },

  markNew: function(items) {
    var hasNew = false;

    // mark new, un-seen items as such
    for (var i in items) {
      var newItem = items[i];

      // is it in the current set of items?
      var oldItem = null;
      for (var j in this.items) {
        if (this.items[j].bug.id == newItem.bug.id) {
          oldItem = this.items[j];
          break;
        }
      }
      newItem.new = !oldItem || oldItem.new;
      hasNew = hasNew || !oldItem;
    }

    return hasNew;
  },

  clearUpdates: function() {
    for (var i in this.items) {
      this.items[i].new = false;
    }
    this.trigger("update-count-changed");
    this.trigger("markers-cleared");
  }
}

function QueueRow(item, type) {
  this.item = item;
  this.el = $("<div/>");
  this.el.addClass("list-item " + type + "-item");

  if (item.new) {
    this.el.addClass("new-item");
  }

  this.template = Handlebars.compile($("#" + type + "-item").html());
}
QueueRow.prototype = {
  render: function() {
    $(this.el).html(this.template(this.item));
    return this;
  }
}

function QueueList() {}
QueueList.prototype = {
  initialize: function(collection, type) {
    this.collection = collection;

    collection.on("add", this.addRow, this);
    collection.on("reset", this.render, this);
    collection.on("new-user", this.showSpinner, this);
    collection.on("update-count-changed", this.updateTally, this);
    collection.on("markers-cleared", this.clearMarkers, this);

    // this.type is defined by subclasses
    this.list = $("#" + this.type + "-list");
    this.tab = $("#" + this.type + "-tab");
  },

  render: function() {
    this.list.empty();

    var self = this;
    this.collection.items.forEach(function(item) {
      self.addRow(item);
    });

    if (!this.collection.items.length) {
      this.showEmpty();
    }
    this.updateTally();

    $(".timeago").timeago();
  },

  showEmpty: function() {
    var item = $("<div class='list-item empty-message'></div>");
    item.text(this.emptyMessage);
    this.list.append(item);
  },

  addRow: function(item) {
    var view = new QueueRow(item, this.type);
    this.list.append(view.render().el);
  },

  updateTally: function(clear) {
    var tally = this.collection.items.length;
    if (clear) {
      tally = "";
    }
    $("#" + this.type + "-tab").find(".tally").html(tally);

    var addedText = "";
    if (this.collection.updateCount) {
      addedText = "+" + this.collection.updateCount;
    }
    $("#" + this.type + "-tab").find(".added-tally").html(addedText);
  },

  clearMarkers: function() {
    this.list.find(".list-item").removeClass("new-item");
  },

  showSpinner: function() {
    // clear any previous list
    this.list.empty();
    this.updateTally(true);

    var item = $("<div class='list-item'></div>");
    var spinner = $("<img src='lib/indicator.gif' class='spinner'></img>");
    item.append(spinner);
    this.list.append(item);
  }
}