import { initializeApp } from "firebase-admin/app";
import { STAFF_ROLES, WRITER_ROLES } from "@setu/shared";
import { stub } from "./util.js";

initializeApp();

export const adminApproveUser  = stub("adminApproveUser", ["admin"]);
export const adminSetRole      = stub("adminSetRole", ["admin"]);
export const signOutEverywhere = stub("signOutEverywhere");
export const adminCreatePair   = stub("adminCreatePair", ["admin"]);
export const submitLetter      = stub("submitLetter", WRITER_ROLES);
export const reviewLetter      = stub("reviewLetter", STAFF_ROLES);
export const reportPair        = stub("reportPair", WRITER_ROLES);