import { ID } from "node-appwrite";
import account from "../api/appwrite.js";
import { Request, Response, NextFunction } from "express";

export const createUser = async (req: Request, res: Response) => {
    const id = ID.unique();
    account.create(id, req.body.email, req.body.password).then(
        function (response) {
            res.status(201).json(response);
        },
        function (error) {
            res.status(error.code).json({ message: error.response.message });
        }
    );

    account
        .createEmailPasswordSession(req.body.email, req.body.password)
        .then(function (sessionResponse) {
            account
                .createVerification("http://localhost:3000/verify-email")
                .then(
                    function (response) {
                        console.log(response); // Success
                    },
                    function (error) {
                        console.log(error); // Failure
                    }
                );
        });
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        // Create a session for the user
        const session = await account.createEmailPasswordSession(
            req.body.email,
            req.body.password
        );
        console.log("Session created:", session); // Debugging success

        // Create an email verification link
        const verificationResponse = await account.createVerification(
            "http://localhost:3000/verify-email"
        );
        console.log("Verification link response:", verificationResponse);

        // Send a success response to the client
        res.status(200).json({
            message: "Login successful! Verification email sent.",
            session,
            verification: verificationResponse,
        });
    } catch (error: any) {
        console.error("Error during login:", error); // Debugging failure
        res.status(error.code || 500).json({
            message: error.response?.message || "An unexpected error occurred.",
        });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    const { userId, secret } = req.query;

    if (!userId || !secret) {
        return res.status(400).json({
            message: "Invalid or missing verification token.",
        });
    }

    try {
        // Call Appwrite to complete the email verification
        const response = await account.updateVerification(
            userId as string,
            secret as string
        );
        console.log("Email verified successfully:", response);

        // Respond with success or redirect to a confirmation page
        res.status(200).json({
            message: "Email verified successfully! You can now log in.",
        });
    } catch (error: any) {
        console.error("Error verifying email:", error);
        res.status(error.code || 500).json({
            message: error.response?.message || "Failed to verify email.",
        });
    }
};

// export const loginUser = async (req: Request, res: Response) => {
//     try {
//         account
//             .createEmailPasswordSession(req.body.email, req.body.password)
//             .then((response) => {
//                 console.log(response); // Success
//                 res.status(200).json(response);
//             });
//     } catch (error) {
//         res.status(error.code).json({ message: error.response.message });
//     }
// };
