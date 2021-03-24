from flask import Flask, jsonify, request
from flask_cors import CORS
from base64 import b64encode
from hashlib import sha256
from hmac import HMAC
from urllib import parse

app = Flask(__name__)
CORS(app)

app_secret = ''

list_dict = {}

@app.route('/<user_id>', methods=['GET'])
def todo_list(user_id):
    if(is_valid(getQuery(request), app_secret, user_id)):
        user_list = None
        try:
            user_list = list_dict[str(user_id)]
        except KeyError:
            list_dict[str(user_id)] = []
            user_list = []
            
        return jsonify({'list': user_list})
    else: return {}, 401

@app.route('/save/<user_id>', methods=['POST'])
def save_todo(user_id):
    if(is_valid(getQuery(request), app_secret, user_id)):
        json_data = request.get_json()
        list_dict[user_id] = json_data['list']
        return {}, 200
    else: return {}, 401

def getQuery(request):
    if request.referrer is not None:
        parsed_ref = parse.parse_qs(parse.urlsplit(request.referrer).query)
        return dict(parsed_ref)
    return {}

# Validation that user was authenticated with VK before making any request
def is_valid(query: dict, secret: str, user_id: str) -> bool:
    """
    Check VK Apps signature - partial user verification

    :param dict query: Dictionary with app launch params
    :param str secret: app_secret

    """
    if not query.get("sign"):
        print("no sign")
        return False

    if user_id != query.get("vk_user_id")[0]:
        print("mismatch user_id")
        return False
    
    vk_subset = sorted(
        filter(
            lambda key: key.startswith("vk_"), 
            query
        )
    )

    if not vk_subset:
        print("no subset")
        return False

    ordered = {k: query[k] for k in vk_subset}

    hash_code = b64encode(
        HMAC(
            secret.encode(), 
            parse.urlencode(ordered, doseq=True).encode(), 
            sha256
        ).digest()
    ).decode("utf-8")

    if hash_code[-1] == "=":
        hash_code = hash_code[:-1]

    fixed_hash = hash_code.replace('+', '-').replace('/', '_')
    print(query.get("sign"))
    print(fixed_hash)
    return query.get("sign")[0] == fixed_hash

if __name__ == '__main__':
    app.run()
