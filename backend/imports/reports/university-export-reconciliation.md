# CampusOS Reconciliation Report

Generated: 2026-03-27T11:34:29.765Z
Source: manual-reconciliation

## Files

- students: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\students.sample.csv
- teachers: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\teachers.sample.csv
- courses: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\courses.sample.csv
- enrollments: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\enrollments.sample.csv
- schedule: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\schedule.sample.csv

## Summary

### Students
- rows in export: 2
- rows in CampusOS: 1
- matched: 0
- mismatched: 0
- only in export: 2
- only in CampusOS: 1
- invalid: 0
- duplicate export rows: 0
- duplicate CampusOS rows: 0

### Teachers
- rows in export: 2
- rows in CampusOS: 1
- matched: 0
- mismatched: 0
- only in export: 2
- only in CampusOS: 1
- invalid: 0
- duplicate export rows: 0
- duplicate CampusOS rows: 0

### Courses
- rows in export: 2
- rows in CampusOS: 3
- matched: 0
- mismatched: 0
- only in export: 2
- only in CampusOS: 3
- invalid: 0
- duplicate export rows: 0
- duplicate CampusOS rows: 0

### Enrollments
- rows in export: 2
- rows in CampusOS: 2
- matched: 0
- mismatched: 0
- only in export: 2
- only in CampusOS: 2
- invalid: 0
- duplicate export rows: 0
- duplicate CampusOS rows: 0

### Schedule
- rows in export: 2
- rows in CampusOS: 47
- matched: 0
- mismatched: 0
- only in export: 2
- only in CampusOS: 47
- invalid: 0
- duplicate export rows: 0
- duplicate CampusOS rows: 0

## Validation Issues

- No validation issues found.

## Findings

- [only_in_export] students 240151001: present in export but missing in CampusOS.
- [only_in_export] students 240151002: present in export but missing in CampusOS.
- [only_in_campusos] students 240141052: present in CampusOS but missing in export.
- [only_in_export] teachers mirlan.abdraimov@alatoo.edu.kg: present in export but missing in CampusOS.
- [only_in_export] teachers aizada.ryskulbekova@alatoo.edu.kg: present in export but missing in CampusOS.
- [only_in_campusos] teachers teacher@alatoo.edu.kg: present in CampusOS but missing in export.
- [only_in_export] courses CYB240: present in export but missing in CampusOS.
- [only_in_export] courses SE260: present in export but missing in CampusOS.
- [only_in_campusos] courses CS101: present in CampusOS but missing in export.
- [only_in_campusos] courses MATH201: present in CampusOS but missing in export.
- [only_in_campusos] courses WEB101: present in CampusOS but missing in export.
- [only_in_export] enrollments 240151001|CYB240: present in export but missing in CampusOS.
- [only_in_export] enrollments 240151002|SE260: present in export but missing in CampusOS.
- [only_in_campusos] enrollments 240141052|CS101: present in CampusOS but missing in export.
- [only_in_campusos] enrollments 240141052|MATH201: present in CampusOS but missing in export.
- [only_in_export] schedule Monday|08:00-08:40|CYB240|group|CYB-24||: present in export but missing in CampusOS.
- [only_in_export] schedule Friday|15:30-16:10|SE260|individual|||temirlan.baialiev@alatoo.edu.kg: present in export but missing in CampusOS.
- [only_in_campusos] schedule Понедельник|09:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|10:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|12:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|13:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|15:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|09:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|10:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|12:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|13:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|15:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|09:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|10:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|12:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|13:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Четверг|09:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Четверг|10:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Четверг|12:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Четверг|13:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Пятница|09:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Пятница|10:30||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Пятница|12:00||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|08:00-08:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|08:45-09:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|09:30-10:10||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|10:15-10:55||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|11:00-11:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|11:45-12:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|08:00-08:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|08:45-09:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|09:30-10:10||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|10:15-10:55||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|11:00-11:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Вторник|11:45-12:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|10:15-10:55||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|11:00-11:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|11:45-12:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|08:00-08:40||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|08:45-09:25||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Среда|09:30-10:10||group|COMCEH-23||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|08:00-08:40||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|09:30-10:10||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|08:45-09:25||group|COMSE-25||: present in CampusOS but missing in export.
- [only_in_campusos] schedule Понедельник|11:45-12:25||group|COMSE-25||: present in CampusOS but missing in export.