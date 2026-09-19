const common = {
  actions: {
    save: "Save",
    saveChanges: "Save changes",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    retry: "Retry",
    search: "Search",
    back: "Back",
    done: "Done",
    remove: "Remove",
    send: "Send",
    copy: "Copy",
    copied: "Copied",
    logout: "Logout",
  },
  state: {
    loading: "Loading…",
    saving: "Saving…",
    error: "Something went wrong. Please try again.",
    none: "None",
    optional: "optional",
    empty: "Nothing here yet.",
  },
  fields: {
    name: "Name",
    email: "Email",
    date: "Date",
    time: "Time",
    type: "Type",
    status: "Status",
    subject: "Subject",
    grade: "Grade",
    class: "Class",
    actions: "Actions",
  },
  filters: {
    all: "All",
    today: "Today",
    upcoming: "Upcoming",
    past: "Past",
  },
  subjectSelect: {
    placeholder: "Select a subject",
  },
  dateTimePicker: {
    placeholder: "Pick a date & time",
  },
  passwordHint:
    "Password must be 8-50 characters and include at least one lowercase and one uppercase letter.",
  counter: {
    items: "{count, plural, one {# item} other {# items}}",
  },
}

export default common
