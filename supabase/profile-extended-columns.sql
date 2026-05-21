-- Run in Supabase SQL editor to add extended profile columns
alter table profiles add column if not exists toefl_score int;
alter table profiles add column if not exists ielts_score numeric;
alter table profiles add column if not exists gmat_score int;
alter table profiles add column if not exists research_interests text;
alter table profiles add column if not exists experience text;
alter table profiles add column if not exists education text;
