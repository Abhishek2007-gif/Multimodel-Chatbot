import re
import uuid
from fastapi import Header, HTTPException, status


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and illegal characters."""
    filename = re.sub(r"[^\w\s\.-]", "", filename).strip()
    return filename or f"file_{uuid.uuid4().hex[:8]}"


async def get_session_id(x_session_id: str = Header(default=None)) -> str:
    """
    Extract and validate the anonymous session identifier from HTTP headers.
    Ensures complete isolation across distinct browser sessions.
    """
    if not x_session_id:
        # Default or generate a random session id if not provided
        return str(uuid.uuid4())
    
    # Validate session format (UUID or alphanumeric slug)
    cleaned = x_session_id.strip()
    if len(cleaned) < 8 or len(cleaned) > 64 or not re.match(r"^[\w\-]+$", cleaned):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Session-ID header format. Must be a valid UUID or alphanumeric string."
        )
    return cleaned
