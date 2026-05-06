/**
 * Copyright Alen Pepa 2026
 */
import { io } from "socket.io-client";

// Connect to the same host serving the page
export const socket = io({ autoConnect: true });
