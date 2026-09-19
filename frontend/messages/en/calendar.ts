const calendar = {
  page: {
    title: "Calendar",
    subtitle: "Your weekly schedule, containing classes and evaluations.",
  },
  syncHint: {
    ariaLabel: "Sync your calendar with external apps",
    text: "You can add this calendar to your favorite calendar app in <settings>settings</settings>.",
  },
  newClass: "New class",
  dayOff: "Day off",
  unknownSubject: "Unknown",
  dayHeader: {
    cancelledUndo: "This day is cancelled. Tap to undo.",
    cancelDay: "Cancel this day",
  },
  reasons: {
    field: "Reason",
    select: "Select a reason",
    break: "Break",
    publicHoliday: "Public holiday",
    other: "Other",
    line: "Reason: {reason}",
  },
  note: {
    label: "Note",
    describe: "Describe the reason…",
    required: "Note (required)",
  },
  popover: {
    dayCancelled: "This day was cancelled.",
    classCancelled: "This class was cancelled.",
  },
  uncancel: "Uncancel",
  uncancelDay: "Uncancel day",
  cancelClass: "Cancel class",
  cancelClassDescription: "This will cancel the class on {date}.",
  cancelDay: "Cancel day",
  deleteEvaluation: "Delete evaluation",
  cancelled: "Cancelled",
  cancelledClass: "Cancelled class",
  editClass: {
    title: "Edit class",
    description: "Rescheduling only affects upcoming dates starting today.",
  },
  createClass: {
    title: "New class",
    description: "Add a class to your schedule",
    noSubjects: "Please add a subject in settings first before creating a class",
  },
  schedules: {
    label: "Schedules",
    dayPlaceholder: "Day",
    add: "Add schedule",
    removeAria: "Remove schedule",
    startTimeAria: "Start time for schedule {index}",
    endTimeAria: "End time for schedule {index}",
    endedOn: "Ended {date}",
  },
  deleteClass: {
    title: "Delete {subject} class?",
    description: "This will remove all recurring instances of this class from your schedule.",
    usedByEvaluation: "This class has one or more evaluations and can't be deleted.",
  },
  errorUnknown: "Something went wrong.",
}

export default calendar