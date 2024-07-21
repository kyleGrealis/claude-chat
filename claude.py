import anthropic
import colorama
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
my_api_key = os.getenv("ANTHROPIC_API_KEY")

client = anthropic.Anthropic(
    api_key=my_api_key,
)

# add color output
colorama.init()
def add_color(text, color):
    colors = {
        'green': '\033[92m',
        'yellow': '\033[93m',
        'purple': '\033[0;35m'
    }
    return f'{colors.get(color, '')}{text}\033[0m'

# initial display
print(add_color(
    f'\n\n------------------------------------------------------------------------------',
    'green'
))
print(add_color('Post your question to Claude from Anthropic!', 'green'))
print('(Use ".x" to quit)')


# chat functionality
messages = []
ask = True

while ask:
    # user prompt: 
    content = input(add_color('\n>>:  ', 'purple')).strip()
    if content == '.x':
        ask = False
        break

    messages.append({'role': 'user', 'content': content})

    # Claude reply
    message = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1024,
        messages=messages
    )
    
    reply = message.content[0].text
    messages.append({'role': 'assistant', 'content': reply})

    # output
    print(add_color('\nResponse:', 'yellow'))
    print(reply)
    print(add_color(
        f'------------------------------------------------------------------------------',
        'yellow'
    ))
