function LoadingSpinner({ size = "medium", message = "Loading..." }) {
  const sizes = {
    small: 20,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      minHeight: size === "large" ? "400px" : "200px"
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `${spinnerSize / 10}px solid #f3f3f3`,
          borderTop: `${spinnerSize / 10}px solid #007bff`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}
      />
      {message && (
        <p style={{
          marginTop: 16,
          color: "#6c757d",
          fontSize: 14,
          fontWeight: 500
        }}>
          {message}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;
