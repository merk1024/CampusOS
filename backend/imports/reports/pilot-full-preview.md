# CampusOS Data Import Report

Generated: 2026-03-27T06:37:13.073Z
Mode: preview
Source: manual-import

## Files

- students: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\students.sample.csv
- teachers: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\teachers.sample.csv
- courses: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\courses.sample.csv
- enrollments: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\enrollments.sample.csv
- schedule: C:\Users\admin\Desktop\CampusOS\backend\imports\templates\schedule.sample.csv

## Summary

### Students
- rows: 2
- valid: 2
- warnings: 0
- errors: 0
- create: 2
- update: 0
- skip: 0

### Teachers
- rows: 2
- valid: 2
- warnings: 0
- errors: 0
- create: 2
- update: 0
- skip: 0

### Courses
- rows: 2
- valid: 2
- warnings: 0
- errors: 0
- create: 2
- update: 0
- skip: 0

### Enrollments
- rows: 2
- valid: 2
- warnings: 0
- errors: 0
- create: 2
- update: 0
- skip: 0

### Schedule
- rows: 2
- valid: 2
- warnings: 0
- errors: 0
- create: 2
- update: 0
- skip: 0

## Issues

- No validation issues found.

## Preview

### Students
- row 2: create -> {"student_id":"240151001","name":"Ainura Ismailova","email":"ainura.ismailova@alatoo.edu.kg","role":"student","group_name":"CYB-24","subgroup_name":"1-Group","faculty":"School of Engineering and Applied Sciences","major":"Cybersecurity","year_of_study":2,"phone":"+996700111001","advisor":"Azhar Kazakbaeva","study_status":"active","grant_type":"grant","program_class":"CYB-24A","registration_date":"2024-09-01","date_of_birth":"2006-04-12","address":"Bishkek","father_name":"Ismail Ismailov","avatar":"AI","is_active":1}
- row 3: create -> {"student_id":"240151002","name":"Temirlan Baialiev","email":"temirlan.baialiev@alatoo.edu.kg","role":"student","group_name":"CYB-24","subgroup_name":"2-Group","faculty":"School of Engineering and Applied Sciences","major":"Cybersecurity","year_of_study":2,"phone":"+996700111002","advisor":"Azhar Kazakbaeva","study_status":"active","grant_type":"contract","program_class":"CYB-24B","registration_date":"2024-09-01","date_of_birth":"2005-11-02","address":"Kant","father_name":"Baiali Baialiev","avatar":"TB","is_active":1}

### Teachers
- row 2: create -> {"name":"Mirlan Abdraimov","email":"mirlan.abdraimov@alatoo.edu.kg","role":"teacher","faculty":"School of Engineering and Applied Sciences","major":"Applied Security","phone":"+996700211001","advisor":null,"address":"Office C-203","avatar":"MA","is_active":1}
- row 3: create -> {"name":"Aizada Ryskulbekova","email":"aizada.ryskulbekova@alatoo.edu.kg","role":"teacher","faculty":"School of Engineering and Applied Sciences","major":"Software Architecture","phone":"+996700211002","advisor":null,"address":"Office B-114","avatar":"AR","is_active":1}

### Courses
- row 2: create -> {"code":"CYB240","name":"Security Operations Center Lab","description":"Hands-on blue team workflows and alert triage","credits":4,"semester":"Fall 2026","teacher_email":"mirlan.abdraimov@alatoo.edu.kg"}
- row 3: create -> {"code":"SE260","name":"Architecture and Testing Studio","description":"Service design patterns with practical QA checkpoints","credits":3,"semester":"Fall 2026","teacher_email":"aizada.ryskulbekova@alatoo.edu.kg"}

### Enrollments
- row 2: create -> {"student_id":"240151001","student_email":"ainura.ismailova@alatoo.edu.kg","course_code":"CYB240","enrolled_at":"2026-02-01 00:00:00"}
- row 3: create -> {"student_id":"240151002","student_email":"temirlan.baialiev@alatoo.edu.kg","course_code":"SE260","enrolled_at":"2026-02-02 00:00:00"}

### Schedule
- row 2: create -> {"course_code":"CYB240","day":"Monday","time_slot":"08:00-08:40","group_name":"CYB-24","audience_type":"group","subgroup_name":null,"student_id":"","student_email":null,"room":"SOC-Lab","subject":"Security Operations Center Lab","teacher":null}
- row 3: create -> {"course_code":"SE260","day":"Friday","time_slot":"15:30-16:10","group_name":null,"audience_type":"individual","subgroup_name":null,"student_id":"","student_email":"temirlan.baialiev@alatoo.edu.kg","room":"Studio-4","subject":null,"teacher":null}
