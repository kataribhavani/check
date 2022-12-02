import React, { useState } from "react";
import "./App.css";

function RegisterCredentials() {
  const [isRegSuccess, setRegSuccess] = useState();
  const [isAuthSuccess, setAuthSuccess] = useState();
  const [status, setStatus] = useState(null);
  const apiUrl = "http://localhost:8080";
  const bufferToBase64 = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const base64ToBuffer = (base64) =>
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const register = async () => {
    try {
      const credentialCreationOptions = await (
        await fetch(`${apiUrl}/registration-options`, {
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
      ).json();

      credentialCreationOptions.challenge = new Uint8Array(
        credentialCreationOptions.challenge.data
      );
      credentialCreationOptions.user.id = new Uint8Array(
        credentialCreationOptions.user.id.data
      );
      credentialCreationOptions.user.name = "pwa@example.com";
      credentialCreationOptions.user.displayName = "What PWA Can Do Today";

      const credential = await navigator.credentials.create({
        publicKey: credentialCreationOptions,
      });

      const credentialId = bufferToBase64(credential.rawId);

      localStorage.setItem("credential", JSON.stringify({ credentialId }));

      const data = {
        rawId: credentialId,
        response: {
          attestationObject: bufferToBase64(
            credential.response.attestationObject
          ),
          clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
          id: credential.id,
          type: credential.type,
        },
      };

      await (
        await fetch(`${apiUrl}/register`, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential: data }),
          credentials: "include",
        })
      ).json();

      setRegSuccess(true);
    } catch (e) {
      setRegSuccess(false);
    }
  };

  const authenticate = async () => {
    try {
      const credentialRequestOptions = await (
        await fetch(`${apiUrl}/authentication-options`, {
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
      ).json();

      const { credentialId } = JSON.parse(localStorage.getItem("credential"));

      credentialRequestOptions.challenge = new Uint8Array(
        credentialRequestOptions.challenge.data
      );
      credentialRequestOptions.allowCredentials = [
        {
          id: base64ToBuffer(credentialId),
          type: "public-key",
          transports: ["internal"],
        },
      ];

      const credential = await navigator.credentials.get({
        publicKey: credentialRequestOptions,
      });

      const data = {
        rawId: bufferToBase64(credential.rawId),
        response: {
          authenticatorData: bufferToBase64(
            credential.response.authenticatorData
          ),
          signature: bufferToBase64(credential.response.signature),
          userHandle: bufferToBase64(credential.response.userHandle),
          clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
          id: credential.id,
          type: credential.type,
        },
      };

      const response = await fetch(`${apiUrl}/authenticate`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: data }),
        credentials: "include",
      });

      if (response.status === 404) {
        setStatus(response.status);
        // removeCredential();
      } else {
        const assertionResponse = await response.json();
        setAuthSuccess(true);
        setStatus(response.status);
      }
    } catch (e) {
      setAuthSuccess(false);
    }
  };

  const removeCredential = () => {
    localStorage.removeItem("credential");
    setRegSuccess(null);
    setAuthSuccess(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        {isRegSuccess !== true ? (
          <button type="button" onClick={register}>
            Register Credential
          </button>
        ) : null}
        {isRegSuccess ? (
          <div>
            {!isAuthSuccess ? <div>Registration successfull</div> : null}
            <div>
              <button type="button" onClick={authenticate}>
                Authentication credentials
              </button>
            </div>
            <div>
              <button type="button" onClick={removeCredential}>
                Delete credentials
              </button>
            </div>
          </div>
        ) : isRegSuccess === false ? (
          <div>Registration failed</div>
        ) : null}
        {isAuthSuccess ? (
          <div>Authentication successfull</div>
        ) : isAuthSuccess === false ? (
          <div>Authentication failed</div>
        ) : status === 404 ? (
          <div>Credential has expired, please register a new credential</div>
        ) : null}
      </header>
    </div>
  );
}

export default RegisterCredentials;
