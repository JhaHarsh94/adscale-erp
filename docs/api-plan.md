# AdScale One ERP — API Plan

## Authentication APIs

POST /api/auth/register  
POST /api/auth/login  
POST /api/auth/forgot-password  
POST /api/auth/verify-otp  
POST /api/auth/reset-password  
GET /api/auth/me  
POST /api/auth/logout  

## Role APIs

GET /api/roles  
POST /api/roles  
PUT /api/roles/:id  
DELETE /api/roles/:id  

## Permission APIs

GET /api/permissions  
POST /api/permissions  
PUT /api/permissions/:id  
DELETE /api/permissions/:id  

## Department APIs

GET /api/departments  
POST /api/departments  
GET /api/departments/:id  
PUT /api/departments/:id  
DELETE /api/departments/:id  

## Employee APIs

GET /api/employees  
POST /api/employees  
GET /api/employees/:id  
PUT /api/employees/:id  
DELETE /api/employees/:id  

## Attendance APIs

POST /api/attendance/check-in  
POST /api/attendance/check-out  
GET /api/attendance/today  
GET /api/attendance/report  

## CRM APIs

GET /api/clients  
POST /api/clients  
GET /api/clients/:id  
PUT /api/clients/:id  
DELETE /api/clients/:id