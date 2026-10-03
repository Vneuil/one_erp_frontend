# HR, Recruitment, Projects & LMS Flow

## Overview

This document explains, in plain language, how the HR, Recruitment, Projects, and Learning Management (LMS) areas of ONE ERP work today, and where they fall short of behaving like a single, connected system. The short version: attendance and reimbursements are solid and reference real employee records. Payroll, Leave, Cooperative Loans, Recruitment, Projects, and LMS all *work* as standalone features, but most of them do not actually talk to each other the way a real ERP would — they store the other side's data as a typed-in name rather than a real link, and several "approval" actions skip checks a real business process would require.

## Use Case: Employee Attendance & Leave Request

**Attendance** works correctly end-to-end: every clock-in/clock-out record is tied to a real employee via their NIP (employee ID number), so attendance history is trustworthy and traceable to a real person in the Employees module.

**Leave Requests**, however, are much weaker. A leave request only stores the employee's typed name and department as plain text — there is no real link to the Employees record. More importantly, approving a leave request does not check anything: there is no concept of a leave balance or annual quota anywhere in the system. An employee could request (and have approved) 300 days of leave in a year with nothing stopping it. Approval simply flips a status flag from "pending" to "approved."

## Use Case: Monthly Payroll Run

Payroll entries are created and calculated manually per period. The Base Salary, allowances, overtime, and deductions on each payroll entry are typed in (or generated with placeholder logic) — the calculation does **not** pull the employee's actual Base Salary from their Employee record in HRM. If an employee's real salary changes in the Employees module, Payroll has no way of knowing.

Payroll does have a "Cooperative Deduction" field, but see below — it isn't actually fed by real loan data.

## Use Case: Cooperative Loan Application

A cooperative loan correctly computes and stores a `MonthlyDeduction` amount for the borrower. However, Payroll's calculation code has zero references to the Cooperative module. The two systems are completely disconnected: an employee could have an active loan with a monthly deduction of, say, Rp 500,000, and their payroll's "Deduction Coop" field would still need to be entered by hand and could easily be wrong or forgotten. This was flagged as a likely gap when these modules were built, and the audit confirms it — there is no code path connecting the two.

## Use Case: Expense Reimbursement Claim

This one works as expected. A claim moves through `pending_approval -> approved -> paid -> rejected`, and the system correctly blocks a claim from being marked "paid" unless it is already "approved" — you cannot skip the approval step. This is the cleanest approval workflow in the whole domain.

## Use Case: Recruitment to Onboarding

Hiring a candidate updates the candidate's own record (stage becomes "hired") and decrements the job vacancy's opening count, closing it out at zero. That part is correct. But hiring a candidate does **not** create an Employee record in HRM. Recruitment and HRM Employees are two separate, disconnected systems — a "hired" candidate simply sits in the Recruitment module forever with no automatic bridge into the employee roster, attendance, payroll, or anything else. Someone has to manually re-enter the person as a new Employee.

## Use Case: Project Task Management (Kanban)

Tasks on the Kanban board belong to a Project, but only via a loosely-matched project code string (not a real foreign key), and the task's "Assignee" is a free-typed name, not a real Employee link. More importantly, moving a task to "Done" on the Kanban board has no effect on the Project's Progress percentage — Progress is a manually-typed field on the Project itself, updated by whoever edits the project, not derived from how many tasks are actually complete.

## Use Case: Timesheet Logging

Timesheet entries reference a Project only through a project code string, and the worker is a typed name, not a real Employee ID — so a timesheet entry cannot be reliably traced back to a specific employee record. Logged hours (and their hourly rate) also do not feed into the Project's Actual Cost — that field, like Progress, is manually maintained. So project costing does not actually reflect the labor logged in Timesheets.

## Use Case: Employee Training (LMS)

Course enrollment and completion are tracked, but again only by a typed employee name, not a real Employee ID. There is no employee "training record" field or view anywhere in HRM that an LMS completion could feed into — even though this would be a natural and valuable connection (e.g., showing certifications or completed compliance training on an employee's profile). Today, LMS is a fully standalone module.

## Known Gaps / Recommendations

1. **Leave Requests have no balance/quota check.** `LeaveRequest` (in `internal/modules/leave`) has no employee link and no balance concept — approval just changes a status string. Recommend: add an `EmployeeID`, a leave quota/balance table, and a real check in `ApproveLeaveRequest` before approval succeeds.

2. **Cooperative Loans and Payroll are fully disconnected.** `Cooperative.MonthlyDeduction` is calculated and stored but never read by `internal/modules/payroll`. Payroll's `DeductionCoop` field is entered manually. Recommend: when generating a payroll period, look up each employee's active loans and auto-populate `DeductionCoop` from `MonthlyDeduction`, then decrement `RemainingBalance` on successful payroll run.

3. **Payroll does not read real salary data.** `PayrollEntry.BaseSalary` is entered per-entry rather than pulled from `Employee.BaseSalary` in HRM. Recommend: payroll generation should source Base Salary from the Employee record, with manual entry only as an override.

4. **Recruitment hiring does not create an Employee record.** `RecruitmentUseCase.hire()` (in `internal/modules/recruitment`) only updates the Candidate and JobVacancy; it never creates a row in HRM's Employee table. Recommend: on hire, auto-create (or prompt to create) an Employee record pre-filled from the candidate's data.

5. **Projects, Tasks, and Timesheets use string references instead of real employee/project links, and don't roll up.** `ProjectTask.Assignee` and `TimeEntry.WorkerName` are free text, not Employee IDs; `Project.Progress` and `Project.ActualCost` are manually edited fields with no automatic calculation from task completion or logged timesheet hours/rates. Recommend: link tasks and time entries to real Employee IDs, and compute Progress from task completion ratio and ActualCost from billable timesheet hours x rate.

6. **LMS completions don't reach an employee training record.** `Enrollment.EmployeeName` is free text, and HRM has no training-record concept to receive LMS completions. Recommend: link enrollments to Employee IDs and add a training-history view on the employee profile.

7. **Attendance and Reimbursements are the two workflows that behave correctly today** — Attendance links to real employees via NIP, and Reimbursement's approve -> paid transition is properly gated. These can serve as the reference pattern for fixing the gaps above.
